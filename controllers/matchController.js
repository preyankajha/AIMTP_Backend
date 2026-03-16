const Match = require('../models/Match');

// @desc    Get my matches
// @route   GET /api/matches/my
// @access  Private
const getMyMatches = async (req, res, next) => {
  try {
    const matches = await Match.find({
      $or: [{ userA: req.user._id }, { userB: req.user._id }],
      status: 'active',
    })
      .populate('userA', 'name mobile')
      .populate('userB', 'name mobile')
      .populate('requestA', 'designation currentZone currentDivision currentStation desiredZone desiredDivision desiredStation')
      .populate('requestB', 'designation currentZone currentDivision currentStation desiredZone desiredDivision desiredStation')
      .sort({ createdAt: -1 });

    // For each match, determine which user is "you" and which is "partner"
    const formattedMatches = matches.map((match) => {
      const isUserA = match.userA._id.toString() === req.user._id.toString();
      const partner = isUserA ? match.userB : match.userA;
      const myRequest = isUserA ? match.requestA : match.requestB;
      const partnerRequest = isUserA ? match.requestB : match.requestA;

      const hasRevealedContact = match.contactRevealed.some(
        (id) => id.toString() === req.user._id.toString()
      );

      return {
        matchId: match._id,
        partner: {
          _id: partner._id,
          name: partner.name,
          designation: partnerRequest.designation,
          region: partnerRequest.currentZone,
          division: partnerRequest.currentDivision,
          station: partnerRequest.currentStation,
          mobile: hasRevealedContact ? partner.mobile : null,
        },
        myRequest,
        partnerRequest,
        contactRevealed: hasRevealedContact,
        createdAt: match.createdAt,
      };
    });

    res.json({ matches: formattedMatches, total: formattedMatches.length });
  } catch (error) {
    next(error);
  }
};

// @desc    Reveal contact for a match
// @route   POST /api/matches/reveal-contact
// @access  Private
const revealContact = async (req, res, next) => {
  try {
    const { matchId } = req.body;

    if (!matchId) {
      return res.status(400).json({ message: 'matchId is required' });
    }

    const match = await Match.findById(matchId)
      .populate('userA', 'name mobile')
      .populate('userB', 'name mobile');

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    // Ensure requesting user is part of this match
    const isUserA = match.userA._id.toString() === req.user._id.toString();
    const isUserB = match.userB._id.toString() === req.user._id.toString();

    if (!isUserA && !isUserB) {
      return res.status(403).json({ message: 'Not authorized to view this match' });
    }

    // Add user to contactRevealed if not already there
    const alreadyRevealed = match.contactRevealed.some(
      (id) => id.toString() === req.user._id.toString()
    );

    if (!alreadyRevealed) {
      match.contactRevealed.push(req.user._id);
      await match.save();
    }

    const partner = isUserA ? match.userB : match.userA;

    res.json({
      message: 'Contact revealed successfully',
      partnerName: partner.name,
      partnerMobile: partner.mobile,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyMatches, revealContact };
