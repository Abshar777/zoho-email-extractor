// Simulates the exact export logic with 7k+ emails, some with massive To/CC/Body fields
// Run with: node test-export.mjs

import * as XLSX from "xlsx";

function generateEmails(count) {
  const emails = [];
  for (let i = 0; i < count; i++) {
    let toAddress = `user${i}@example.com`;
    let ccAddress = "";
    let body = `This is the body of email number ${i}. `.repeat(10);

    // Simulate bulk/newsletter emails every ~500 emails (like a real inbox)
    if (i % 500 === 0) {
      // Massive To field — newsletter sent to thousands of people
      // 1400 recipients @ ~28 chars each = ~39,200 chars → exceeds 32,767 Excel limit
      const recipients = Array.from({ length: 1400 }, (_, j) => `recipient${j}@company-domain.com`);
      toAddress = recipients.join(", ");
    }

    // Simulate CC-heavy thread every ~300 emails
    if (i % 300 === 0) {
      // 1200 CC addresses @ ~27 chars each = ~32,400 chars → right at the edge
      const ccList = Array.from({ length: 1200 }, (_, j) => `cc.user${j}@domain.org`);
      ccAddress = ccList.join(", ");
    }

    // Simulate some emails with very long bodies (5000 chars, as per the current cap)
    if (i % 100 === 0) {
      body = "A".repeat(5000);
    }

    emails.push({
      messageId: `msg_${i}`,
      subject: `Test Email Subject ${i} — with some extra text`,
      fromAddress: `sender${i % 50}@example.com`,
      toAddress,
      ccAddress,
      sentDateInGMT: String(Date.now() - i * 60000),
      receivedTime: String(Date.now() - i * 60000),
      summary: `Preview text for email ${i}`,
      hasAttachment: i % 7 === 0 ? "1" : "0",
      folderId: "folder1",
      status: i % 4 === 0 ? "unread" : "read",
      body,
    });
  }
  return emails;
}

console.log("Generating 7,979 emails (matching the screenshot)...");
const emails = generateEmails(7979);

console.log(`Total emails: ${emails.length}`);
console.log(`Emails with massive To field (800 recipients): ${emails.filter((_, i) => i % 500 === 0).length}`);
console.log(`Emails with massive CC field (400 recipients): ${emails.filter((_, i) => i % 300 === 0).length}`);

// Check max field lengths
const maxTo = Math.max(...emails.map(e => e.toAddress.length));
const maxCC = Math.max(...emails.map(e => e.ccAddress.length));
const maxBody = Math.max(...emails.map(e => e.body.length));
console.log(`\nMax To length:   ${maxTo.toLocaleString()} chars  (Excel limit: 32,767)`);
console.log(`Max CC length:   ${maxCC.toLocaleString()} chars  (Excel limit: 32,767)`);
console.log(`Max Body length: ${maxBody.toLocaleString()} chars  (Excel limit: 32,767)`);

if (maxTo > 32767 || maxCC > 32767 || maxBody > 32767) {
  console.log("\n⚠️  WILL CRASH — fields exceed Excel 32,767 char limit");
} else {
  console.log("\n✓ All fields within limit");
}

console.log("\nBuilding Excel sheet (this will throw if any cell exceeds 32,767 chars)...");
try {
  const CELL_LIMIT = 32767;
  const cap = (s) => s.slice(0, CELL_LIMIT);

  const rows = emails.map((email, i) => {
    const ts = parseInt(email.sentDateInGMT || email.receivedTime || "0");
    const date = ts ? new Date(ts).toISOString().replace("T", " ").slice(0, 19) + " UTC" : "";
    return {
      "#": i + 1,
      Date: date,
      From: cap(email.fromAddress ?? ""),
      To: cap(email.toAddress ?? ""),
      CC: cap(email.ccAddress === "Not Provided" ? "" : (email.ccAddress ?? "")),
      Subject: cap(email.subject ?? ""),
      Body: cap(email.body ?? ""),
      Attachments: email.hasAttachment === "1" ? 1 : 0,
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 5 }, { wch: 22 }, { wch: 30 }, { wch: 30 },
    { wch: 25 }, { wch: 40 }, { wch: 80 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Emails");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  console.log(`\n✓ SUCCESS — Excel built, size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
} catch (err) {
  console.log(`\n✗ CRASH — ${err.message}`);
  console.log("  This confirms the bug. The fix: cap all string fields at 32,767 chars.");
}
