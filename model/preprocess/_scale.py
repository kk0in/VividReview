from sklearn.preprocessing import StandardScaler
from datetime import datetime
import joblib
from glob import glob
import pandas as pd
import os
import shutil


DATA_PATH = "./assets/overlap/"
SCALED_PATH = "./assets/scaled/"
os.makedirs(SCALED_PATH, exist_ok=True)

timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
scaler_save = SCALED_PATH+f"scaler_{timestamp}.joblib"
scaler = StandardScaler()

X_train = pd.read_csv(DATA_PATH+"X_train.csv", header=None)
scaled_X_train = scaler.fit_transform(X_train)
pd.DataFrame(scaled_X_train).to_csv(SCALED_PATH+"X_train.csv", index=False, header=None)

X_test = pd.read_csv(DATA_PATH+"X_test.csv", header=None)
scaled_X_test = scaler.transform(X_test)
pd.DataFrame(scaled_X_test).to_csv(SCALED_PATH+"X_test.csv", index=False, header=None)

X_val = pd.read_csv(DATA_PATH+"X_val.csv", header=None)
scaled_X_val = scaler.transform(X_val)
pd.DataFrame(scaled_X_val).to_csv(SCALED_PATH+"X_val.csv", index=False, header=None)

shutil.copy(DATA_PATH+"Y_train.csv", SCALED_PATH+"Y_train.csv")
shutil.copy(DATA_PATH+"Y_test.csv", SCALED_PATH+"Y_test.csv")
shutil.copy(DATA_PATH+"Y_val.csv", SCALED_PATH+"Y_val.csv")

joblib.dump(scaler, scaler_save)