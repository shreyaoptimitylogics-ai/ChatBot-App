const User = require('../models/User.model');
const Message = require('../models/Message.model');
const Conversation = require('../models/Conversation.model');
const { getOrCreateConversation } = require('../controllers/message.controller');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);


    socket.on('user:join', async (userId) => {
      try {
        const user = await User.findByIdAndUpdate(
          userId,
          { socketId: socket.id, isOnline: true },
          { new: true }
        );
        socket.userId = userId;
        socket.emit('user:updated', user);


        const onlineUsers = await User.find({ isOnline: true }).select('-socketId');
        io.emit('users:online', onlineUsers);
      } catch (err) {
        console.error(err);
      }
    });


    socket.on('message:send', async ({ receiverId, text }) => {
      try {
        const conversation = await getOrCreateConversation(socket.userId, receiverId);


        const message = await Message.create({
          conversationId: conversation._id,
          senderId: socket.userId,
          receiverId,
          text,
          status: 'sent',
        });


        await Conversation.findByIdAndUpdate(conversation._id, {
          lastMessage: message._id,
          lastMessageText: text,
          lastMessageTime: new Date(),
          $inc: { [`unreadCount.${receiverId}`]: 1 },
        });

        const populated = await message.populate('senderId', 'name');


        socket.emit('message:sent', populated);


        const receiver = await User.findById(receiverId);
        if (receiver?.socketId) {
          io.to(receiver.socketId).emit('message:received', populated);
        }
      } catch (err) {
        console.error(err);
      }
    });


    socket.on('message:delivered', async ({ messageId }) => {
      try {
        const message = await Message.findByIdAndUpdate(
          messageId,
          { status: 'delivered' },
          { new: true }
        );
        const sender = await User.findById(message.senderId);
        if (sender?.socketId) {
          io.to(sender.socketId).emit('message:status', {
            messageId,
            status: 'delivered',
          });
        }
      } catch (err) {
        console.error(err);
      }
    });


    socket.on('message:read', async ({ conversationId, senderId }) => {
      try {
        await Message.updateMany(
          { conversationId, receiverId: socket.userId, status: { $ne: 'read' } },
          { status: 'read' }
        );
        const sender = await User.findById(senderId);
        if (sender?.socketId) {
          io.to(sender.socketId).emit('message:read', { conversationId });
        }
      } catch (err) {
        console.error(err);
      }
    });


    socket.on('typing:start', async ({ receiverId }) => {
      const receiver = await User.findById(receiverId);
      if (receiver?.socketId) {
        io.to(receiver.socketId).emit('typing:start', { senderId: socket.userId });
      }
    });

    socket.on('typing:stop', async ({ receiverId }) => {
      const receiver = await User.findById(receiverId);
      if (receiver?.socketId) {
        io.to(receiver.socketId).emit('typing:stop', { senderId: socket.userId });
      }
    });


    socket.on('disconnect', async () => {
      if (!socket.userId) return;
      await User.findByIdAndUpdate(socket.userId, {
        socketId: null,
        isOnline: false,
        lastSeen: new Date(),
      });
      const onlineUsers = await User.find({ isOnline: true }).select('-socketId');
      io.emit('users:online', onlineUsers);
    });
  });
};