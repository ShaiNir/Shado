'use strict';

// Get insight of the day
exports.index = function(req, res) {
    return res.json(200, "Another name for cocktail sauce is dickbutt sauce -- /r/showerthoughts")
};

function handleError(res, error) {
    return res.send(500, error);
}
