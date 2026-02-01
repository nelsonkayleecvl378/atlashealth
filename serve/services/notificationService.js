const { v4: uuidv4 } = require("uuid");
const db = require("../db");

const NOTIFICATION_TYPE = {
  APPOINTMENT_REQUEST: "appointment_request",
  APPOINTMENT_UPDATE: "appointment_update",
  ACCESS_GRANTED: "access_granted",
  ACCESS_REVOKED: "access_revoked",
  RECORD_ADDED: "record_added",
  SYSTEM: "system",
};

const createNotification = (userId, notificationData) => {
  const data = db.read();

  if (!data.notifications) {
    data.notifications = [];
  }

  const notification = {
    id: uuidv4(),
    userId,
    type: notificationData.type || NOTIFICATION_TYPE.SYSTEM,
    title: notificationData.title,
    message: notificationData.message,
    data: notificationData.data || {},
    read: false,
    readAt: null,
    createdAt: new Date().toISOString(),
  };

  data.notifications.push(notification);
  db.write(data);

  return notification;
};

const getUserNotifications = (userId) => {
  const data = db.read();
  const notifications = (data.notifications || [])
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    notifications,
    total: notifications.length,
    unread: notifications.filter((n) => !n.read).length,
  };
};

const markAsRead = (notificationId, userId) => {
  const data = db.read();
  const index = (data.notifications || []).findIndex(
    (n) => n.id === notificationId && n.userId === userId
  );

  if (index === -1) {
    throw new Error("Notification not found");
  }

  data.notifications[index].read = true;
  data.notifications[index].readAt = new Date().toISOString();
  db.write(data);

  return data.notifications[index];
};

const markAllAsRead = (userId) => {
  const data = db.read();
  let count = 0;

  data.notifications = data.notifications.map((n) => {
    if (n.userId === userId && !n.read) {
      n.read = true;
      n.readAt = new Date().toISOString();
      count++;
    }
    return n;
  });

  db.write(data);

  return { markedCount: count };
};

module.exports = {
  NOTIFICATION_TYPE,
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
};
