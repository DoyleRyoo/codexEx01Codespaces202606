// Express 모듈을 불러옵니다.
const express = require('express');

// Express 서버 애플리케이션을 생성합니다.
const app = express();

app.use(express.static('frontend/public'));

// Render는 실행 포트를 PORT 환경 변수로 전달합니다.
const PORT = process.env.PORT || 3000;

const allowedOrigins = (
  process.env.CORS_ORIGIN ||
  process.env.FRONTEND_ORIGIN ||
  process.env.FRONTEND_URL ||
  ''
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Render의 분리 배포 환경에서 프론트엔드가 백엔드 API를 호출할 수 있게 합니다.
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin) {
    const isAllowedOrigin = allowedOrigins.length === 0 || allowedOrigins.includes(origin);

    if (isAllowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigins.length === 0 ? '*' : origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// JSON 형식의 요청 body를 req.body에서 사용할 수 있게 합니다.
app.use(express.json());

// 자동차 목록을 메모리에 저장합니다. 서버를 재시작하면 초기 데이터로 돌아갑니다.
let cars = [
  { _id: 1, name: 'Sonata', price: 2500, company: 'HYUNDAI', year: 2023 },
  { _id: 2, name: 'K5', price: 2700, company: 'KIA', year: 2024 },
  { _id: 3, name: 'SM6', price: 2300, company: 'RENAULT', year: 2022 },
];

// GET / 요청이 들어오면 "Hello Codex"라는 문자를 응답합니다.
app.get('/', (req, res) => {
  res.send('Hello Codex');
});

app.get('/healthz', (req, res) => {
  res.json({ status: 'ok' });
});

// 전체 자동차 목록을 JSON으로 응답합니다.
app.get('/cars', (req, res) => {
  res.json(cars);
});

// company 쿼리 값과 일치하는 자동차 목록을 JSON으로 응답합니다.
app.get('/cars/search', (req, res) => {
  const { company } = req.query;

  if (!company) {
    return res.json(cars);
  }

  const filteredCars = cars.filter((item) => item.company === company);
  res.json(filteredCars);
});

// minPrice와 maxPrice 쿼리 값 사이의 자동차 목록을 JSON으로 응답합니다.
app.get('/cars/filter', (req, res) => {
  const { minPrice, maxPrice } = req.query;
  const hasMinPrice = minPrice !== undefined;
  const hasMaxPrice = maxPrice !== undefined;
  const min = Number(minPrice);
  const max = Number(maxPrice);

  const filteredCars = cars.filter((item) => {
    if (hasMinPrice && item.price < min) {
      return false;
    }

    if (hasMaxPrice && item.price > max) {
      return false;
    }

    return true;
  });

  res.json(filteredCars);
});

// URL의 id와 일치하는 자동차 한 대를 찾아 응답합니다.
app.get('/cars/:id', (req, res) => {
  const id = Number(req.params.id);
  const car = cars.find((item) => item._id === id);

  if (!car) {
    return res.status(404).json({ message: 'Car not found' });
  }

  res.json(car);
});

// 요청 body로 받은 자동차 정보를 목록에 추가합니다.
app.post('/cars', (req, res) => {
  const newCar = req.body;
  cars.push(newCar);

  res.status(201).json(newCar);
});

// URL의 id와 일치하는 자동차 정보를 요청 body 내용으로 수정합니다.
app.put('/cars/:id', (req, res) => {
  const id = Number(req.params.id);
  const carIndex = cars.findIndex((item) => item._id === id);

  if (carIndex === -1) {
    return res.status(404).json({ message: 'Car not found' });
  }

  cars[carIndex] = { ...cars[carIndex], ...req.body, _id: id };
  res.json(cars[carIndex]);
});

// URL의 id와 일치하는 자동차를 목록에서 삭제합니다.
app.delete('/cars/:id', (req, res) => {
  const id = Number(req.params.id);
  const carIndex = cars.findIndex((item) => item._id === id);

  if (carIndex === -1) {
    return res.status(404).json({ message: 'Car not found' });
  }

  const deletedCar = cars.splice(carIndex, 1)[0];
  res.json(deletedCar);
});

// 지정된 포트에서 서버를 실행합니다.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
