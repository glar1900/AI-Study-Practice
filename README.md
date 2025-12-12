# 🎟️ 티켓팅 시뮬레이션 - 웹 크롤링 실습

BeautifulSoup과 Selenium (ChromeDriver) 테스트를 위한 티켓팅 시뮬레이션 웹 애플리케이션입니다.

## 📋 주요 기능

- **시간 기반 동기화**: 모든 사용자가 같은 시간에 같은 좌석 표시
- **닉네임 시스템**: 최초 방문 시 닉네임 입력
- **예매 기록**: 성공한 예매 내역 표시
- **캐시 메커니즘**: 수동 새로고침 버튼으로 좌석 정보 업데이트
- **좌석 오픈 주기**: 20초마다 1.5초간 랜덤 좌석 오픈

## 🚀 Vercel 배포 (권장)

### 1. GitHub 저장소 생성

```bash
git init
git add .
git commit -m "Initial commit: 티켓팅 시뮬레이션"
git remote add origin https://github.com/유저명/ticketing-sim.git
git push -u origin main
```

### 2. Vercel에 배포

1. [vercel.com](https://vercel.com) 접속
2. **GitHub 계정으로 로그인**
3. **New Project** 클릭
4. GitHub 저장소 `ticketing-sim` Import
5. **Deploy** 클릭 (설정 변경 불필요)
6. 완료! 자동으로 URL 생성됨

### 3. 자동 배포

이후 GitHub에 푸시할 때마다 Vercel이 자동으로 재배포합니다:

```bash
git add .
git commit -m "Update features"
git push
```

## 💻 로컬 개발 (선택사항)

```bash
# 의존성 설치
npm install

# 개발 서버 시작
npm run dev

# 브라우저에서 열기
# http://localhost:3000
```

## 📡 API 엔드포인트

### GET /api/seats
좌석 상태 조회

**Response:**
```json
{
  "seats": {
    "A1": "occupied",
    "B5": "available",
    "C3": "booked"
  },
  "currentOpen": {
    "seat": "B5",
    "openTime": 1234567890000,
    "closeTime": 1234567891500
  },
  "timestamp": 1234567890123
}
```

### POST /api/book
좌석 예매

**Request:**
```json
{
  "nickname": "홍길동",
  "seatId": "B5"
}
```

**Response:**
```json
{
  "success": true,
  "message": "예매에 성공했습니다!",
  "booking": {
    "nickname": "홍길동",
    "seatId": "B5",
    "timestamp": 1234567890123,
    "time": "2025-12-12 20:48:00"
  }
}
```

### GET /api/bookings
예매 기록 조회

**Response:**
```json
{
  "bookings": [
    {
      "nickname": "홍길동",
      "seatId": "B5",
      "timestamp": 1234567890123,
      "time": "2025-12-12 20:48:00"
    }
  ]
}
```

## 🤖 웹 크롤링 실습

### Selenium 예제

```python
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

driver = webdriver.Chrome()

# 배포된 URL 사용
driver.get("https://your-app.vercel.app")

# 닉네임 입력
nickname_input = WebDriverWait(driver, 10).until(
    EC.presence_of_element_located((By.ID, "nicknameInput"))
)
nickname_input.send_keys("크롤러봇")
driver.find_element(By.CSS_SELECTOR, ".btn-confirm").click()

time.sleep(1)

# 좌석 모니터링
while True:
    # 새로고침 버튼 클릭
    refresh_btn = driver.find_element(By.ID, "refreshBtn")
    refresh_btn.click()
    time.sleep(0.5)
    
    # 예약 가능한 좌석 찾기
    available_seats = driver.find_elements(By.CSS_SELECTOR, ".seat.available")
    
    if available_seats:
        print(f"발견! {available_seats[0].text}")
        available_seats[0].click()
        time.sleep(0.2)
        
        # 확인 버튼 클릭
        driver.find_element(By.CSS_SELECTOR, ".btn-primary").click()
        time.sleep(0.1)
        
        # 모달 확인
        driver.find_element(By.CSS_SELECTOR, ".btn-confirm").click()
        time.sleep(0.5)
        
        # 결과 확인
        success_msg = driver.find_element(By.ID, "successMessage")
        if success_msg.is_displayed():
            print(f"성공: {success_msg.text}")
            break
    
    time.sleep(2)

driver.quit()
```

### BeautifulSoup + requests 예제

```python
import requests
from bs4 import BeautifulSoup
import time

url = "https://your-app.vercel.app"

while True:
    # 좌석 정보 가져오기
    resp = requests.get(f"{url}/api/seats")
    data = resp.json()
    
    # 예약 가능한 좌석 찾기
    available = [seat_id for seat_id, status in data['seats'].items() 
                 if status == 'available']
    
    if available:
        seat_id = available[0]
        print(f"좌석 발견: {seat_id}")
        
        # 예매 시도
        book_resp = requests.post(f"{url}/api/book", json={
            "nickname": "API봇",
            "seatId": seat_id
        })
        
        result = book_resp.json()
        print(f"결과: {result['message']}")
        
        if result['success']:
            break
    
    time.sleep(1)
```

## 📂 파일 구조

```
ticketing-sim/
├── index.html          # 프론트엔드
├── api/
│   └── index.js       # Vercel Serverless Functions
├── server.js          # 로컬 개발용 Express 서버
├── package.json       # 의존성
├── vercel.json        # Vercel 배포 설정
└── README.md          # 이 파일
```

## 💡 참고사항

### Vercel Serverless Functions 제한사항
- **상태 공유 안됨**: 각 함수 인스턴스가 독립적
- **현재 구현**: 인메모리 저장 (재배포 시 데이터 초기화)
- **프로덕션**: Redis 또는 데이터베이스 사용 권장

### 크롤링 실습 팁
1. **캐시 이해하기**: 새로고침 버튼 클릭해야 최신 데이터
2. **타이밍**: 1.5초 내에 클릭 → 확인 → 모달 확인 완료해야 성공
3. **동시 접속**: 여러 크롤러 실행하여 경쟁 테스트 가능

---

**Made with ❤️ for Web Crawling Study**
