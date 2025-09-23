import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Camera, useCameraDevice, PhotoFile } from "react-native-vision-camera";

export default function App() {
  const camera = useRef<Camera>(null);
  const device = useCameraDevice("back");
  const [hasPermission, setHasPermission] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<PhotoFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === "granted");
    })();
  }, []);

  if (device == null) return <Text style={styles.infoText}>Loading camera...</Text>;
  if (!hasPermission) return <Text style={styles.infoText}>No camera permission</Text>;

  const takePhoto = async () => {
    if (camera.current == null) return;
    try {
      const photo: PhotoFile = await camera.current.takePhoto();
      setPhotoPreview(photo); // tampilkan preview
    } catch (e) {
      console.error("❌ Gagal ambil foto:", e);
    }
  };

  const retakePhoto = () => {
    setPhotoPreview(null);
  };

  const confirmPhoto = async () => {
    if (!photoPreview) return;

    try {
      setIsLoading(true);

      const formData = new FormData();
      formData.append("foodImage", {
        uri: "file://" + photoPreview.path, // path dari vision-camera
        name: "food.jpg",                   // nama file (wajib ada)
        type: "image/jpeg",                 // mime type
      } as any);

      const response = await fetch("https://mydiet-backend-production.up.railway.app/analyze-food", {
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      const result = await response.json();
      console.log("✅ API Response:", JSON.stringify(result));

      // pilih nilai kalori
      let kalori: string | number = "Kalori tidak diketahui";
      if (result?.data?.jumlah_kalori !== undefined) {
        kalori = result.data.jumlah_kalori;
      } else if (result?.data?.perkiraan_kalori !== undefined) {
        kalori = result.data.perkiraan_kalori;
      }

      Alert.alert(
        "Hasil Analisis",
        `Makanan: ${result?.data?.nama_makanan ?? "Tidak diketahui"}\nKalori: ${kalori}`
      );
    } catch (error) {
      console.error("❌ Upload gagal:", error);
      Alert.alert("Error", "Gagal mengupload atau memproses gambar");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {photoPreview ? (
        // Preview Foto
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: "file://" + photoPreview.path }}
            style={styles.previewImage}
          />
          <View style={styles.previewButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#ff4444" }]}
              onPress={retakePhoto}
            >
              <Text style={styles.actionText}>Ulangi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#4CAF50" }]}
              onPress={confirmPhoto}
            >
              <Text style={styles.actionText}>Gunakan Foto</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // Kamera Aktif
        <>
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
            photo={true}
            ref={camera}
          />

          {/* Frame Overlay */}
          <View style={styles.frame} />

          {/* Tombol Capture */}
          <View style={styles.controls}>
            <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Progress Dialog */}
      <Modal transparent={true} visible={isLoading}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={{ color: "white", marginTop: 10 }}>Menganalisa foto...</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  infoText: { flex: 1, color: "white", textAlign: "center", textAlignVertical: "center" },

  // Kamera
  controls: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    alignItems: "center",
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "white",
  },

  // Frame overlay
  frame: {
    position: "absolute",
    top: "20%",
    left: "10%",
    width: "80%",
    height: "40%",
    borderWidth: 1,
    borderColor: "white",
    borderRadius: 16,
  },

  // Preview Foto
  previewContainer: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: "80%",
    resizeMode: "contain",
  },
  previewButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    padding: 20,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 10,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  actionText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },

  // Modal Loading
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    padding: 20,
    backgroundColor: "#222",
    borderRadius: 10,
    alignItems: "center",
  },
});
