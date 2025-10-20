const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`=€ Server is running on port ${PORT}`);
  console.log(`=Í Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`< API URL: http://localhost:${PORT}`);
});
