const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");

const port = new SerialPort({
  path: "COM4",
  baudRate: 9600,
});

const parser = port.pipe(
  new ReadlineParser({
    delimiter: "\r\n",
  })
);

const DETECTION_DISTANCE = 50;

// Mencegah satu orang menghasilkan banyak IN
let personDetected = false;

port.on("open", () => {
  console.log("✅ Arduino Uno terhubung di COM4");
});

port.on("error", (error) => {
  console.error("❌ Serial error:", error.message);
});

parser.on("data", async (data) => {
  console.log("📡 Data Arduino:", data);

  if (!data.startsWith("DISTANCE:")) {
    return;
  }

  const distance = parseFloat(data.replace("DISTANCE:", ""));

  if (Number.isNaN(distance)) {
    return;
  }

  console.log(`📏 Jarak: ${distance.toFixed(2)} cm`);

  const detected = distance <= DETECTION_DISTANCE;

  // Tidak ada perubahan status
  if (detected === personDetected) {
    return;
  }

  personDetected = detected;

  // Orang/objek baru terdeteksi
  if (detected) {
    console.log("👤 ORANG TERDETEKSI → IN");

    try {
      const response = await fetch(
        "http://localhost:5000/api/sensor/log",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            room_id: 1,
            event_type: "IN",
          }),
        }
      );

      const result = await response.json();

      console.log("💾 Server:", result);
    } catch (error) {
      console.error("❌ Gagal mengirim ke server:", error.message);
    }
  } else {
    console.log("⭕ Sensor kembali kosong");
  }
});