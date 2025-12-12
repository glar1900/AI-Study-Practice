const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 좌석 상태 (인메모리)
const ROWS = 10;
const COLS = 10;
const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

// 예매 기록
let bookings = [];

// 시간 기반 좌석 상태 계산
function getSeatStatusAtTime(timestamp) {
  const CYCLE_DURATION = 20000; // 20초 주기
  const SEAT_OPEN_DURATION = 1500; // 1.5초 오픈
  
  const cyclePosition = timestamp % CYCLE_DURATION;
  const isOpen = cyclePosition < SEAT_OPEN_DURATION;
  
  if (!isOpen) {
    return null;
  }
  
  // 현재 사이클의 시작 시각
  const cycleStart = timestamp - cyclePosition;
  
  // 모든 좌석 리스트
  const allSeats = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 1; col <= COLS; col++) {
      allSeats.push(`${ROW_LABELS[row]}${col}`);
    }
  }
  
  // 예매된 좌석 제외
  const bookedSeats = new Set(bookings.map(b => b.seatId));
  const availableSeats = allSeats.filter(seat => !bookedSeats.has(seat));
  
  if (availableSeats.length === 0) {
    return null; // 모든 좌석 예매됨
  }
  
  // 시드 기반 좌석 선택
  const seatIndex = Math.abs(Math.sin(cycleStart / 1000) * 10000) % availableSeats.length;
  const selectedSeat = availableSeats[Math.floor(seatIndex)];
  
  return {
    seat: selectedSeat,
    openTime: cycleStart,
    closeTime: cycleStart + SEAT_OPEN_DURATION
  };
}

// API: 좌석 상태 조회
app.get('/api/seats', (req, res) => {
  const now = Date.now();
  const seatStatus = getSeatStatusAtTime(now);
  
  // 모든 좌석 초기화
  const seats = {};
  for (let row = 0; row < ROWS; row++) {
    for (let col = 1; col <= COLS; col++) {
      const seatId = `${ROW_LABELS[row]}${col}`;
      seats[seatId] = 'occupied';
    }
  }
  
  // 예매된 좌석 표시
  bookings.forEach(booking => {
    seats[booking.seatId] = 'booked';
  });
  
  // 현재 오픈된 좌석
  if (seatStatus && !bookings.find(b => b.seatId === seatStatus.seat)) {
    seats[seatStatus.seat] = 'available';
  }
  
  console.log(`[${new Date().toLocaleTimeString()}] 좌석 상태 조회`);
  if (seatStatus) {
    console.log(`  - 오픈 좌석: ${seatStatus.seat}`);
  }
  
  res.json({
    seats,
    currentOpen: seatStatus,
    timestamp: now
  });
});

// API: 좌석 예매
app.post('/api/book', (req, res) => {
  const { nickname, seatId } = req.body;
  const now = Date.now();
  
  if (!nickname || !seatId) {
    return res.status(400).json({
      success: false,
      message: '닉네임과 좌석 번호가 필요합니다.'
    });
  }
  
  // 이미 예매된 좌석인지 확인
  const alreadyBooked = bookings.find(b => b.seatId === seatId);
  if (alreadyBooked) {
    console.log(`[${new Date().toLocaleTimeString()}] 예매 실패: ${seatId} (이미 예매됨 by ${alreadyBooked.nickname})`);
    return res.json({
      success: false,
      message: `이미 예약된 좌석입니다 (${alreadyBooked.nickname}님이 예매)`
    });
  }
  
  // 현재 오픈된 좌석인지 확인
  const seatStatus = getSeatStatusAtTime(now);
  if (!seatStatus || seatStatus.seat !== seatId) {
    console.log(`[${new Date().toLocaleTimeString()}] 예매 실패: ${seatId} (좌석 오픈 안 됨 또는 마감)`);
    return res.json({
      success: false,
      message: '좌석이 열려있지 않거나 이미 마감되었습니다.'
    });
  }
  
  // 시간 내에 예매했는지 확인
  if (now > seatStatus.closeTime) {
    console.log(`[${new Date().toLocaleTimeString()}] 예매 실패: ${seatId} (시간 초과)`);
    return res.json({
      success: false,
      message: '시간이 초과되었습니다.'
    });
  }
  
  // 예매 성공
  const booking = {
    nickname,
    seatId,
    timestamp: now,
    time: new Date(now).toLocaleString('ko-KR')
  };
  
  bookings.push(booking);
  
  console.log(`[${new Date().toLocaleTimeString()}] 예매 성공: ${seatId} by ${nickname}`);
  
  res.json({
    success: true,
    message: '예매에 성공했습니다!',
    booking
  });
});

// API: 예매 기록 조회
app.get('/api/bookings', (req, res) => {
  res.json({
    bookings: bookings.map(b => ({
      ...b,
      // 비교적 최근 예매를 위로
    })).reverse()
  });
});

// API: 초기화 (디버깅용)
app.post('/api/reset', (req, res) => {
  bookings = [];
  console.log(`[${new Date().toLocaleTimeString()}] 예매 기록 초기화`);
  res.json({ success: true, message: '초기화 완료' });
});

// 정적 파일 서빙
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🎟️  티켓팅 시뮬레이션 서버 시작`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`⏰ 좌석 오픈 주기: 20초마다 1.5초간\n`);
});
