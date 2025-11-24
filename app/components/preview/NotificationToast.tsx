"use client";

import { useEffect } from "react";
import { FileEdit, FilePlus, AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDevContext, Notification } from "@/app/lib/DevContext";

export default function NotificationToast() {
  const { notifications, removeNotification, setSelectedFile, setActivePreviewTab } = useDevContext();

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "file_created":
        return <FilePlus className="w-5 h-5 text-green-600" />;
      case "file_modified":
        return <FileEdit className="w-5 h-5 text-blue-600" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getBgColor = (type: Notification["type"]) => {
    switch (type) {
      case "file_created":
        return "bg-green-50 border-green-200";
      case "file_modified":
        return "bg-blue-50 border-blue-200";
      case "error":
        return "bg-red-50 border-red-200";
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.filePath) {
      try {
        const response = await fetch("/api/files/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: notification.filePath }),
        });

        const data = await response.json();
        if (data.success) {
          setSelectedFile({
            path: data.path,
            content: data.content,
            lastModified: new Date(),
          });
          setActivePreviewTab("files");
        }
      } catch (error) {
        console.error("Error opening file:", error);
      }
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg ${getBgColor(
              notification.type
            )} cursor-pointer hover:shadow-xl transition-shadow`}
            onClick={() => handleNotificationClick(notification)}
          >
            {/* Icon */}
            <div className="flex-shrink-0">{getIcon(notification.type)}</div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {notification.message}
              </p>
              {notification.filePath && (
                <p className="text-xs text-gray-600 mt-1">
                  Click para ver el archivo
                </p>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeNotification(notification.id);
              }}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
