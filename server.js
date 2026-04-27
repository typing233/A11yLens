require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const accessibilityRouter = require('./routes/accessibility');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/screenshots', express.static(path.join(__dirname, 'screenshots')));

app.use('/api/accessibility', accessibilityRouter);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/config', (req, res) => {
  res.json({
    volcengine: {
      accessKey: process.env.VOLCENGINE_ACCESS_KEY ? '已配置' : '未配置',
      modelName: process.env.VOLCENGINE_MODEL_NAME || 'Doubao-pro-32k'
    }
  });
});

app.listen(PORT, () => {
  console.log(`A11yLens 无障碍检测服务已启动: http://localhost:${PORT}`);
});
