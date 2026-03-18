import toast from "react-hot-toast";

type ToastType = "success" | "error" | "info";

export const showToast = (
  type: ToastType,
  message: string
) => {
  const baseStyle = {
    borderRadius: "10px",
    fontWeight: 600,
  };

  if (type === "success") {
    toast.success(message, {
      position: "top-center",
      style: {
        ...baseStyle,
        border: "3px solid #2563eb", // blue
        
        color: "black",
      },
    });
  }

  if (type === "error") {
    toast.error(message, {
      position: "top-right",
      style: {
        ...baseStyle,
        border: "3px solid #dc2626", // red
        background: "#fef2f2",
        color: "#7f1d1d",
      },
    });
  }

  if (type === "info") {
    toast(message, {
      position: "top-center",
      style: {
        ...baseStyle,
        border: "3px solid #ff7800", 
        background: "#fffbeb",
        color: "#92400e",
      },
    });
  }
};
