# 🎟️ 티켓팅 시뮬레이션 - 웹 크롤링 실습

BeautifulSoup과 Selenium (ChromeDriver) 테스트를 위한 티켓팅 시뮬레이션 웹 애플리케이션입니다.

## 📋 기능 설명

- **10x10 좌석 배치** (A1-J10, 영화관 스타일)
- **랜덤 좌석 오픈**: 10-30초 랜덤 간격으로 1개 좌석이 1초간 예약 가능 상태로 변경
- **캐시 메커니즘**: `localStorage`를 사용하여 좌석 정보 캐싱 (새로고침해야 업데이트 확인 가능)
- **예매 플로우**: 좌석 클릭 → 예매 정보 확인 → 확인 버튼 → 모달 확인/취소 → 성공/실패 메시지
- **시간 제한**: 좌석이 오픈된 후 1초 이내에 예매 완료해야 성공

## 🚀 로컬 실행

### 방법 1: 직접 열기
```bash
# index.html을 브라우저에서 직접 열기
start index.html  # Windows
open index.html   # Mac
```

### 방법 2: 로컬 서버 실행
```bash
# Python 내장 서버
python -m http.server 8000

# Node.js http-server (설치 필요)
npx http-server -p 8000
```

그 후 브라우저에서 `http://localhost:8000` 접속

## 🌐 배포 방법

### Vercel 배포

1. **Vercel CLI 설치**
```bash
npm i -g vercel
```

2. **배포**
```bash
cd ticketing-sim
vercel
```

3. 프롬프트에 따라 설정 (기본값으로 진행해도 무방)

### GitHub Pages 배포

1. **GitHub 저장소 생성**
```bash
git init
git add .
git commit -m "Initial commit: 티켓팅 시뮬레이션"
git branch -M main
git remote add origin https://github.com/your-username/ticketing-sim.git
git push -u origin main
```

2. **GitHub Pages 활성화**
- GitHub 저장소 → Settings → Pages
- Source: `main` 브랜치 선택
- 폴더: `/ (root)` 선택
- Save 클릭

3. 몇 분 후 `https://your-username.github.io/ticketing-sim/` 에서 접속 가능

## 🤖 웹 크롤링 실습 예제

### BeautifulSoup 예제

```python
import requests
from bs4 import BeautifulSoup
import time

url = "http://localhost:8000"  # 또는 배포된 URL

# 좌석 정보 크롤링
response = requests.get(url)
soup = BeautifulSoup(response.content, 'html.parser')

# 좌석 찾기
seats = soup.find_all('button', class_='seat')

print(f"총 좌석 수: {len(seats)}")

# 예약 가능한 좌석 찾기
available_seats = [s for s in seats if 'available' in s.get('class', [])]
print(f"예약 가능 좌석: {[s.get('data-seat-id') for s in available_seats]}")
```

### Selenium (ChromeDriver) 예제

```python
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

# ChromeDriver 초기화
driver = webdriver.Chrome()
driver.get("http://localhost:8000")  # 또는 배포된 URL

try:
    # 좌석 정보 읽기
    seats = driver.find_elements(By.CLASS_NAME, "seat")
    print(f"총 좌석 수: {len(seats)}")
    
    # localStorage 캐시 확인
    cache = driver.execute_script("return localStorage.getItem('ticketing_seat_cache');")
    print(f"캐시된 좌석 정보: {cache[:100]}...")
    
    # 예약 가능한 좌석 찾기 (주기적으로 새로고침)
    found_available = False
    attempts = 0
    max_attempts = 20
    
    while not found_available and attempts < max_attempts:
        driver.refresh()
        time.sleep(1)
        
        available_seats = driver.find_elements(By.CSS_SELECTOR, ".seat.available")
        
        if available_seats:
            print(f"\\n예약 가능 좌석 발견! 시도 횟수: {attempts + 1}")
            seat = available_seats[0]
            seat_id = seat.get_attribute('data-seat-id')
            print(f"좌석 번호: {seat_id}")
            
            # 좌석 클릭
            seat.click()
            time.sleep(0.2)
            
            # 확인 버튼 클릭
            confirm_btn = driver.find_element(By.ID, "confirmBtn")
            confirm_btn.click()
            time.sleep(0.1)
            
            # 모달 확인 클릭
            modal_confirm = driver.find_element(By.ID, "modalConfirm")
            modal_confirm.click()
            time.sleep(0.5)
            
            # 결과 확인
            message = driver.find_element(By.ID, "message")
            if message.is_displayed():
                print(f"결과: {message.text}")
                found_available = True
            
        attempts += 1
        
        if not found_available:
            print(f"시도 {attempts}/{max_attempts}: 예약 가능 좌석 없음, 5초 후 재시도...")
            time.sleep(5)
    
    if not found_available:
        print("\\n예약 가능한 좌석을 찾지 못했습니다.")

finally:
    input("\\n엔터를 누르면 브라우저가 종료됩니다...")
    driver.quit()
```

### 크롤링 실습 팁

1. **캐시 메커니즘 이해하기**
   - `localStorage`에 좌석 정보가 저장됨
   - JavaScript로 캐시 읽기: `localStorage.getItem('ticketing_seat_cache')`
   - 새로고침해야 UI에 반영됨

2. **타이밍 공략하기**
   - 좌석은 1초만 유효하므로 빠른 반응 필요
   - Selenium으로 자동화 시 클릭 속도 최적화 필요

3. **무한 루프 방지**
   - 최대 시도 횟수 설정
   - 적절한 대기 시간 (너무 짧으면 서버 부하, 너무 길면 좌석 놓침)

4. **개발자 도구 활용**
   - F12 → Console에서 좌석 오픈 로그 확인 가능
   - Network 탭에서 리소스 로딩 확인

## 📂 파일 구조

```
ticketing-sim/
├── index.html      # 메인 애플리케이션 (HTML + CSS + JavaScript)
├── vercel.json     # Vercel 배포 설정
└── README.md       # 이 파일
```

## 🛠️ 기술 스택

- **HTML5**: 시맨틱 마크업
- **CSS3**: 그라디언트, 애니메이션, Flexbox/Grid 레이아웃
- **Vanilla JavaScript**: localStorage, 이벤트 처리, 타이머
- **Google Fonts**: Noto Sans KR

## 💡 학습 포인트

1. **정적 웹 페이지 크롤링**: BeautifulSoup으로 HTML 파싱
2. **동적 콘텐츠 처리**: Selenium으로 JavaScript 실행 결과 크롤링
3. **캐시 메커니즘**: localStorage 데이터 접근
4. **타이밍 최적화**: 짧은 시간 내에 작업 완료하기
5. **예외 처리**: 좌석이 없을 때, 타임아웃 시 처리

## 📞 문의

웹 크롤링 스터디에서 활용하시면서 문제가 있으시면 언제든 연락주세요!

---

**Made with ❤️ for Web Crawling Study**
