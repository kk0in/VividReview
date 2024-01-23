from model.train_continuous import run_train
from model.test import run_inference


## Train Usage: Put scaler path and chekpoint to test_config.json and run the inference code below.
input_video = "videos/2_test_real_assy.mp4"
input_label_csv = "results/2_test_real_assy_0.csv"
prefill_folder = "/data/samsung/sec/RAW" # Prefill folder: Orginal training video, csv files


scaler_path, checkpoint_path = run_train(input_video, input_label_csv, prefill_folder)
print("Scaler Path:", scaler_path)
print("Checkpoint Path:", checkpoint_path)