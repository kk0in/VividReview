# Server

## 환경설정

### 1단계: 서버 디렉토리로 이동
프로젝트의 서버 디렉토리로 이동합니다.
```bash
cd server
```

### 2단계: pip 업그레이드
Python 패키지 관리자인 pip를 최신 버전으로 업그레이드합니다.
```bash
pip install pip --upgrade
```

### 3단계: 필요한 패키지 설치
requirements.txt에 명시된 필요한 패키지들을 설치합니다.
```bash
pip install -r requirements.txt
```

### 4단계: PyTorch 설치
[PyTorch 공식 웹사이트](https://pytorch.org/get-started/locally/)에 접속하여 CUDA 버전에 맞는 torch 및 torchvision을 다운로드 및 설치 합니다.

### 5단계: mmpose 라이브러리 설치
```bash
pip install -U openmim
mim install mmengine
mim install "mmcv>=2.0.1"
mim install "mmdet>=3.1.0"
```

### 6단계: mmpose weight 다운로드
[Google Drive](https://drive.google.com/drive/u/1/folders/1ni9YmYd0puESIlHh8bIQWwkrYxKAe7F8)에 접속하여 weight 파일 4개를 다운로드 한 후, `server/model/preprocess/model/` 폴더를 생성하여 그 안에 저장합니다.

### 7단계: 모델, scaler weight 다운로드
[Google Drive](https://drive.google.com/drive/u/1/folders/1bpjvQ0E0YGKG5Tl71UozO8b0TOLjaQG-)에 접속하여 scaler, model 파일을 다운로드 받은 후 아무 파일 경로에 저장합니다. 이후 저장된 파일 경로를 `server/model/test_config.json` 파일에 기입합니다.



## Pose Detection Model 재학습

### 1단계: 모델 트레이너 설정
`MODEL_TRAINER.py` 파일을 열고, `input_video`, `input_label_csv`, `prefill_folder`를 적절하게 설정합니다.  
`input_video`: 추가 학습할 영상 파일들 (여러개일 경우 모두 입력)  
`input_label_csv`: 추가 학습할 영상 파일들에 해당하는 모답스 라벨링 (영상과 이름 동일하도록 설정)  
`prefill_folder`: 이미 영상파일들이 여러개 있는 경우 해당 폴더명  

### 2단계: 모델 트레이닝 실행
다음 명령어로 모델 트레이닝을 실행합니다.
```bash
python MODEL_TRAINER.py
```

### 3단계: 스케일러 및 체크포인트 경로 기록
트레이닝 중 생성된 스케일러(scaler) 및 체크포인트(checkpoint) 경로를 메모합니다.

### 4단계: 테스트 설정
`server/model/test_config.json` 파일에 3단계에서 기록한 스케일러 및 체크포인트 경로를 입력합니다.

### 5단계: (재)학습 완료
이제 새롭게 업데이트된 모델로 변경되었습니다. 앞으로 업로드하는 영상에 대해서는 새로운 모델의 추론 결과가 반영됩니다.

---
