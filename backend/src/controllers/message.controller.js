const Message = require('../models/Message.model');
const Conversation = require('../models/Conversation.model');


exports.getOrCreateConversation = async (userA, userB) => {
  let conversation = await Conversation.findOne({
    participants: { $all: [userA, userB] },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [userA, userB],
    });
  }

  return conversation;
};


exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 30;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'name')
      .lean();

    res.json({ success: true, messages: messages.reverse() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.markAsRead = async (req, res) => {
  try {
    const { conversationId, userId } = req.params;

    await Message.updateMany(
      {
        conversationId,
        receiverId: userId,
        status: { $ne: 'read' },
      },
      { status: 'read' }
    );


    await Conversation.findByIdAndUpdate(conversationId, {
      [`unreadCount.${userId}`]: 0,
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};