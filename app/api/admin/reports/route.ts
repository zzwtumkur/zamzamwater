import { db, error, requireAdmin } from "@/lib/server";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

type ReportOrder = {
  id: string;
  order_number: string;
  name: string;
  phone: string;
  address: string;
  landmark: string;
  latitude: number | null;
  longitude: number | null;
  delivery_date: string;
  slot_id: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  payment_status: string;
  created_at: string;
  slots: { label: string } | null;
  order_items: {
    litres: number;
    kind: string;
    qty: number;
    line_total: number;
  }[];
};
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const excluded = ["rejected", "cancelled"];

async function reportData(from: string, to: string) {
  const { data, error: e } = await db()
    .from("orders")
    .select(
      "id,order_number,name,phone,address,landmark,latitude,longitude,delivery_date,slot_id,subtotal,delivery_fee,total,status,payment_status,created_at,slots(label),order_items(litres,kind,qty,line_total)",
    )
    .gte("delivery_date", from)
    .lte("delivery_date", to)
    .order("delivery_date")
    .order("created_at");
  if (e) throw Error(e.message);
  const orders = (data || []) as unknown as ReportOrder[];
  return {
    from,
    to,
    generated_at: new Date().toISOString(),
    summary: {
      orders: orders.length,
      sales: orders
        .filter((o) => !excluded.includes(o.status))
        .reduce((n, o) => n + Number(o.total), 0),
      pending: orders.filter((o) =>
        [
          "new",
          "accepted",
          "preparing",
          "out_for_delivery",
          "rescheduled",
        ].includes(o.status),
      ).length,
      delivered: orders.filter((o) =>
        ["delivered", "completed"].includes(o.status),
      ).length,
      cancelled: orders.filter((o) => excluded.includes(o.status)).length,
    },
    orders,
  };
}

function itemText(order: ReportOrder) {
  return order.order_items
    .map((i) => `${i.qty} x ${i.litres}L ${i.kind}`)
    .join(", ");
}

async function makeXlsx(report: Awaited<ReturnType<typeof reportData>>) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Zam Zam Water";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Order report", {
    views: [{ state: "frozen", ySplit: 7 }],
  });
  sheet.properties.defaultRowHeight = 20;
  sheet.mergeCells("A1:K1");
  sheet.getCell("A1").value = "Zam Zam Water - Order Report";
  sheet.getCell("A1").font = {
    bold: true,
    size: 18,
    color: { argb: "FF073B63" },
  };
  sheet.getCell("A2").value = "Delivery date range";
  sheet.getCell("B2").value = `${report.from} to ${report.to}`;
  sheet.getRow(4).values = [
    "Orders",
    report.summary.orders,
    "Sales",
    report.summary.sales,
    "Pending",
    report.summary.pending,
    "Delivered",
    report.summary.delivered,
    "Cancelled",
    report.summary.cancelled,
  ];
  for (const col of [1, 3, 5, 7, 9])
    sheet.getCell(4, col).font = { bold: true, color: { argb: "FF315B73" } };
  sheet.getCell("D4").numFmt = "₹#,##0.00";
  const header = [
    "Order ID",
    "Delivery Date",
    "Customer",
    "Mobile",
    "Items",
    "Slot",
    "Subtotal",
    "Delivery Fee",
    "Total",
    "Status",
    "Payment",
  ];
  sheet.getRow(6).values = header;
  sheet.getRow(6).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(6).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF087FC1" },
  };
  sheet.getRow(6).alignment = { vertical: "middle" };
  report.orders.forEach((o) =>
    sheet.addRow([
      o.order_number,
      new Date(`${o.delivery_date}T00:00:00`),
      o.name,
      o.phone,
      itemText(o),
      o.slots?.label || "",
      Number(o.subtotal),
      Number(o.delivery_fee),
      Number(o.total),
      o.status.replaceAll("_", " "),
      o.payment_status,
    ]),
  );
  sheet.columns = [
    { width: 19 },
    { width: 15 },
    { width: 22 },
    { width: 15 },
    { width: 34 },
    { width: 18 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 20 },
    { width: 14 },
  ];
  sheet.getColumn(2).numFmt = "dd-mmm-yyyy";
  for (const n of [7, 8, 9]) sheet.getColumn(n).numFmt = "₹#,##0.00";
  sheet.autoFilter = { from: "A6", to: "K6" };
  sheet.eachRow((row, index) => {
    if (index > 6 && index % 2 === 1)
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF2F9FC" },
      };
    row.alignment = { vertical: "top", wrapText: index > 5 };
  });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function makePdf(report: Awaited<ReturnType<typeof reportData>>) {
  const doc = new PDFDocument({ size: "A4", margin: 36, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) =>
    doc.on("end", () => resolve(Buffer.concat(chunks))),
  );
  const blue = "#087fc1",
    navy = "#073b63",
    muted = "#607b8d";
  doc.fillColor(navy).fontSize(20).font("Helvetica-Bold").text("Zam Zam Water");
  doc.fontSize(13).text("Order Report");
  doc
    .moveDown(0.4)
    .fillColor(muted)
    .fontSize(9)
    .font("Helvetica")
    .text(`Delivery dates: ${report.from} to ${report.to}`);
  doc.moveDown();
  doc.fillColor(blue).roundedRect(36, doc.y, 523, 48, 8).fill();
  const y = doc.y + 11;
  const cards = [
    ["Orders", report.summary.orders],
    ["Sales", `INR ${report.summary.sales.toFixed(2)}`],
    ["Pending", report.summary.pending],
    ["Delivered", report.summary.delivered],
    ["Cancelled", report.summary.cancelled],
  ];
  cards.forEach((c, i) =>
    doc
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(`${c[0]}\n${c[1]}`, 44 + i * 103, y, {
        width: 96,
        align: "center",
      }),
  );
  doc.y = y + 52;
  const widths = [74, 58, 90, 145, 62, 62];
  const headers = [
    "Order ID",
    "Date",
    "Customer / Mobile",
    "Items",
    "Total",
    "Status",
  ];
  const drawHeader = () => {
    const top = doc.y;
    doc.fillColor(navy).rect(36, top, 523, 22).fill();
    let x = 40;
    headers.forEach((h, i) => {
      doc
        .fillColor("#fff")
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(h, x, top + 7, { width: widths[i] - 6 });
      x += widths[i];
    });
    doc.y = top + 25;
  };
  drawHeader();
  report.orders.forEach((o, index) => {
    if (doc.y > 745) {
      doc.addPage();
      drawHeader();
    }
    const top = doc.y;
    const height = 34;
    if (index % 2 === 0)
      doc.fillColor("#f2f9fc").rect(36, top, 523, height).fill();
    const cells = [
      o.order_number,
      o.delivery_date,
      `${o.name}\n${o.phone}`,
      itemText(o),
      `INR ${Number(o.total).toFixed(2)}`,
      o.status.replaceAll("_", " "),
    ];
    let x = 40;
      cells.forEach((v, i) => {
        const textOptions = i === 2 || i === 3
          ? {width: widths[i] - 7, height: 26, ellipsis: true}
          : {width: widths[i] - 7, lineBreak: false};
        doc.fillColor("#12324a").font("Helvetica").fontSize(7.5).text(String(v), x, top + 6, textOptions);
      x += widths[i];
    });
    doc.y = top + height;
  });
  if (!report.orders.length)
    doc
      .fillColor(muted)
      .fontSize(10)
      .text("No orders found for this date range.", 36, doc.y + 12);
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc
      .fillColor(muted)
      .fontSize(8)
      .text(
        `Generated ${new Date(report.generated_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} | Page ${i + 1} of ${pages.count}`,
        36,
        790,
        { width: 523, align: "center" },
      );
  }
  doc.end();
  return done;
}

export async function GET(req: Request) {
  if (!(await requireAdmin())) return error("Unauthorized", 401);
  const url = new URL(req.url),
    from = url.searchParams.get("from") || "",
    to = url.searchParams.get("to") || "",
    format = url.searchParams.get("format") || "json";
  if (!datePattern.test(from) || !datePattern.test(to) || from > to)
    return error("Select a valid date range");
  try {
    const report = await reportData(from, to);
    if (format === "json") return Response.json(report);
    if (format === "xlsx") {
      const body = await makeXlsx(report);
      return new Response(new Uint8Array(body), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="zamzam-orders-${from}-to-${to}.xlsx"`,
        },
      });
    }
    if (format === "pdf") {
      const body = await makePdf(report);
      return new Response(new Uint8Array(body), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="zamzam-orders-${from}-to-${to}.pdf"`,
        },
      });
    }
    return error("Unsupported report format");
  } catch (e) {
    return error(
      e instanceof Error ? e.message : "Unable to generate report",
      500,
    );
  }
}
