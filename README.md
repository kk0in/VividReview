# SEC-ST

## Pose Detection Model

### 환경설정

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

### 6단계: 모델 트레이너 설정
`MODEL_TRAINER.py` 파일을 열고, `input_video`, `input_label_csv`, `prefill_folder`를 적절하게 설정합니다.
`input_video`: 추가 학습할 영상 파일들 (여러개일 경우 모두 입력)
`input_label_csv`: 추가 학습할 영상 파일들에 해당하는 모답스 라벨링 (영상과 이름 동일하도록 설정)
`prefill_folder`: 이미 영상파일들이 여러개 있는 경우 해당 폴더명

### 7단계: 모델 트레이닝 실행
다음 명령어로 모델 트레이닝을 실행합니다.
```bash
python MODEL_TRAINER.py
```

### 8단계: 스케일러 및 체크포인트 경로 기록
트레이닝 중 생성된 스케일러(scaler) 및 체크포인트(checkpoint) 경로를 메모합니다.

### 9단계: 테스트 설정
`test_config.json` 파일에 7단계에서 기록한 스케일러 및 체크포인트 경로를 입력합니다.

### 10단계: (재)학습 완료
이제 새롭게 업데이트된 모델로 변경되었습니다. 앞으로 업로드하는 영상에 대해서는 새로운 모델의 추론 결과가 반영됩니다.

---
