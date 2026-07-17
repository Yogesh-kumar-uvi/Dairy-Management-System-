const errorHandler = (err, req, res, next) => {
  console.error(err.message);
  if (err.code === 11000) {
    return res.status(400).json({ message: 'Duplicate value for a unique field' });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors)[0]?.message || 'Validation failed' });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid id' });
  }
  res.status(err.statusCode || 500).json({ message: err.message || 'Server error' });
};

export default errorHandler;
