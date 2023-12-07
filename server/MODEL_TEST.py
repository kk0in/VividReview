from model.train_continuous import run_train
from model.test import run_inference


## Train Usage: Put scaler path and chekpoint to test_config.json and run the inference code below.
input_video = "./test_file/6_1.mp4"
input_label_csv = "./test_file/6_1.csv"
prefill_folder = "/data/samsung/sec/RAW" # Prefill folder: Orginal training video, csv files


scaler_path, checkpoint_path = run_train(input_video, input_label_csv, prefill_folder)
print(scaler_path, checkpoint_path)

## Test Usage
# print(run_inference("/data/samsung/sec/RAW/2/0804_MX_0001.mp4"))