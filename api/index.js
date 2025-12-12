// Vercel Serverless Function으로 API 통합
const ROWS = 10;
const COLS = 10;
const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

// 전역 상태 (Vercel의 경우 인스턴스간 공유 안됨 - 주의!)
// 실제 프로덕션에서는 데이터베이스 사용 권장
let bookings = [];

function getSeatStatusAtTime(timestamp) {
  const CYCLE_DURATION = 20000;
  const SEAT_OPEN_DURATION = 1500;

  const cyclePosition = timestamp % CYCLE_DURATION;
  const isOpen = cyclePosition < SEAT_OPEN_DURATION;

  if (!isOpen) return null;

  const cycleStart = timestamp - cyclePosition;
  const allSeats = [];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 1; col <= COLS; col++) {
      allSeats.push(`${ROW_LABELS[row]}${col}`);
    }
  }

  const bookedSeats = new Set(bookings.map(b => b.seatId));
  const availableSeats = allSeats.filter(seat => !bookedSeats.has(seat));

  if (availableSeats.length === 0) return null;

  const seatIndex = Math.abs(Math.sin(cycleStart / 1000) * 10000) % availableSeats.length;
  const selectedSeat = availableSeats[Math.floor(seatIndex)];

  return {
    seat: selectedSeat,
    openTime: cycleStart,
    closeTime: cycleStart + SEAT_OPEN_DURATION
  };
}

module.exports = async (req, res) => {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method, url } = req;

  // GET /api/seats
  if (method === 'GET' && url === '/api/seats') {
    const now = Date.now();
    const seatStatus = getSeatStatusAtTime(now);

    const seats = {};
    for (let row = 0; row < ROWS; row++) {
      for (let col = 1; col <= COLS; col++) {
        const seatId = `${ROW_LABELS[row]}${col}`;
        seats[seatId] = 'occupied';
      }
    }

    bookings.forEach(booking => {
      seats[booking.seatId] = 'booked';
    });

    if (seatStatus && !bookings.find(b => b.seatId === seatStatus.seat)) {
      seats[seatStatus.seat] = 'available';
    }

    return res.json({
      seats,
      currentOpen: seatStatus,
      timestamp: now
    });
  }

  // POST /api/book
  if (method === 'POST' && url === '/api/book') {
    const { nickname, seatId } = req.body;
    const now = Date.now();

    if (!nickname || !seatId) {
      return res.status(400).json({
        success: false,
        message: '닉네임과 좌석 번호가 필요합니다.'
      });
    }

    const alreadyBooked = bookings.find(b => b.seatId === seatId);
    if (alreadyBooked) {
      return res.json({
        success: false,
        message: `이미 예약된 좌석입니다 (${alreadyBooked.nickname}님이 예매)`
      });
    }

    const seatStatus = getSeatStatusAtTime(now);
    if (!seatStatus || seatStatus.seat !== seatId) {
      return res.json({
        success: false,
        message: '좌석이 열려있지 않거나 이미 마감되었습니다.'
      });
    }

    if (now > seatStatus.closeTime) {
      return res.json({
        success: false,
        message: '시간이 초과되었습니다.'
      });
    }

    const booking = {
      nickname,
      seatId,
      timestamp: now,
      time: new Date(now).toLocaleString('ko-KR')
    };

    bookings.push(booking);

    return res.json({
      success: true,
      message: '예매에 성공했습니다!',
      booking
    });
  }

  // GET /api/bookings
  if (method === 'GET' && url === '/api/bookings') {
    return res.json({
      bookings: bookings.slice().reverse()
    });
  }

  // POST /api/reset
  if (method === 'POST' && url === '/api/reset') {
    bookings = [];
    return res.json({ success: true, message: '초기화 완료' });
  }

  return res.status(404).json({ error: 'Not found' });
};
