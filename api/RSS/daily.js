module.exports = (req, res) => {
  res.status(200).json({
    message: "API 작동 테스트",
    timestamp: new Date().toISOString(),
    path: req.url
  });
};
