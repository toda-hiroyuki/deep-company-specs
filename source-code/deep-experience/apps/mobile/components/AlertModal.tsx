import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from "react-native";

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface AlertModalProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
  onDismiss: () => void;
}

export function AlertModal({
  visible,
  title,
  message,
  buttons,
  onDismiss,
}: AlertModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.buttonRow}>
            {buttons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.button,
                  btn.style === "cancel" && styles.buttonCancel,
                  btn.style === "destructive" && styles.buttonDestructive,
                  buttons.length === 1 && styles.buttonFull,
                ]}
                onPress={() => {
                  onDismiss();
                  btn.onPress?.();
                }}
              >
                <Text
                  style={[
                    styles.buttonText,
                    btn.style === "cancel" && styles.buttonTextCancel,
                    btn.style === "destructive" && styles.buttonTextDestructive,
                  ]}
                >
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 24,
    width: "100%",
    maxWidth: 320,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: "#4b5563",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#2563eb",
    alignItems: "center",
  },
  buttonFull: {
    flex: 1,
  },
  buttonCancel: {
    backgroundColor: "#f3f4f6",
  },
  buttonDestructive: {
    backgroundColor: "#ef4444",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "white",
  },
  buttonTextCancel: {
    color: "#4b5563",
  },
  buttonTextDestructive: {
    color: "white",
  },
});
