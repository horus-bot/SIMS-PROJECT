#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>

// ========================================================
// 🛑 CHANGE THIS NAME FOR EACH BOARD BEFORE UPLOADING! 🛑
// Board 1: "SIMS_BEACON_A"
// Board 2: "SIMS_BEACON_B"
// ========================================================
String BEACON_NAME = "SIMS_BEACON_B"; 

// Use the same UUID for all hospital beacons so the app can find them all at once
#define SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914b"

// On S3 boards, the built-in LED is usually on pin 48 (instead of pin 2)
// Note: Some S3 boards use NeoPixels, which require a different library, 
// but pin 48 works for standard LEDs on most S3s.
#define LED_PIN 48 

class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      Serial.println("Device connected! Restarting broadcast for others...");
      BLEDevice::startAdvertising();
    }
    
    void onDisconnect(BLEServer* pServer) {
      Serial.println("Device disconnected. Ensuring broadcast continues...");
      BLEDevice::startAdvertising();
    }
};

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  
  Serial.print("Starting ");
  Serial.println(BEACON_NAME);

  // Initialize with the unique name
  BLEDevice::init(BEACON_NAME.c_str());

  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);
  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);  
  pAdvertising->setMinPreferred(0x12);
  
  BLEDevice::startAdvertising();
  
  Serial.println("BLE Beacon is now broadcasting!");
  digitalWrite(LED_PIN, HIGH);
}

void loop() {
  // Heartbeat blink
  digitalWrite(LED_PIN, LOW);
  delay(100);
  digitalWrite(LED_PIN, HIGH);
  delay(1900);
}