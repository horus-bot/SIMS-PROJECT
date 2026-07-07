#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>

// Define a unique Service UUID for your hospital navigation beacons
// You can generate new ones at https://www.uuidgenerator.net/
#define SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914b"

// Optional: Onboard LED pin for most ESP32 DevKit V1 boards to show it's working
#define LED_PIN 2 

// --- NEW CODE: Prevent phones from hogging the beacon ---
class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      // If a browser connects, immediately restart broadcasting for other phones!
      Serial.println("Device connected! Restarting broadcast for others...");
      BLEDevice::startAdvertising();
    }
    
    void onDisconnect(BLEServer* pServer) {
      Serial.println("Device disconnected. Ensuring broadcast continues...");
      BLEDevice::startAdvertising();
    }
};
// --------------------------------------------------------

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  
  Serial.println("Starting BLE Beacon for SIMS Navigation...");

  // 1. Initialize the BLE device with a recognizable name
  BLEDevice::init("SIMS_ESP32_BEACON");

  // 2. Create the BLE Server
  BLEServer *pServer = BLEDevice::createServer();
  
  // --- NEW CODE: Attach the callback to the server ---
  pServer->setCallbacks(new MyServerCallbacks());
  // ---------------------------------------------------

  // 3. Create the BLE Service
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // 4. Start the service
  pService->start();

  // 5. Configure and Start Advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  
  // Add the service UUID to the advertisement packet
  pAdvertising->addServiceUUID(SERVICE_UUID);
  
  // Set scan response to true so the browser can request the device name
  pAdvertising->setScanResponse(true);
  
  // These functions help with fast discovery and connection stability (especially for Apple/iOS)
  pAdvertising->setMinPreferred(0x06);  
  pAdvertising->setMinPreferred(0x12);
  
  // Begin broadcasting the signal!
  BLEDevice::startAdvertising();
  
  Serial.println("BLE Beacon is now broadcasting!");
  Serial.println("Open your web app and click 'Scan for ESP32'.");
  
  // Turn on the onboard blue LED to indicate BLE is running successfully
  digitalWrite(LED_PIN, HIGH);
}

void loop() {
  // A simple beacon doesn't need to do anything in the loop!
  // It broadcasts continuously in the background automatically.
  
  // Optional: Blink the LED every 2 seconds to prove the board hasn't frozen
  digitalWrite(LED_PIN, LOW);
  delay(100);
  digitalWrite(LED_PIN, HIGH);
  delay(1900);
}