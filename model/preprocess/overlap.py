import numpy as np
from sklearn.model_selection import StratifiedShuffleSplit
from sklearn.model_selection import train_test_split
import os
from sklearn.preprocessing import StandardScaler
import joblib
from datetime import datetime



PREV_PATH = "./assets/feature/raw/"
NEW_PATH =  "./assets/overlap/"

os.makedirs(PREV_PATH, exist_ok=True)
os.makedirs(NEW_PATH, exist_ok=True)

x_raw_path = PREV_PATH + "X_raw.csv"
x_train_path = NEW_PATH + "X_train.csv"
x_test_path = NEW_PATH + "X_test.csv"
x_val_path = NEW_PATH + "X_val.csv"

y_raw_path = PREV_PATH + "Y_raw.csv"
y_train_path = NEW_PATH + "Y_train.csv"
y_test_path = NEW_PATH + "Y_test.csv"
y_val_path = NEW_PATH + "Y_val.csv"

# labels_mx_topk = ['M3', 'G1', 'M1', 'M2', 'P2', 'R2', 'A2', 'BG']
# labels_mx_topk_wo = ['M', 'G', 'P', 'R']
# labels = labels_mx_topk

FRAME_COUNT = 8 # the number of frames in each overlapped video clips
OVERLAP = 6 # how many frames be overlapped between two adjacent video clips
# for example, if FRAME_COUNT = 6 and OVERLAP = 4, then the first video clip will be 1-6, the second will be 3-8, the third will be 5-10, etc.

TEST_SIZE = 0.1
VAL_SIZE = 0.1


def cut_btw_modaps():
    label_before = ""
    x_this_modapts = []

    x_list = []
    y_list = []

    with open(x_raw_path) as x_raw, open(y_raw_path) as y_raw:

        for lineno, line in enumerate(x_raw):
            label = y_raw.readline()

            # if the next frame(line) is of a different modapts
            if (label != label_before and label_before != ""):
                x_list.append(x_this_modapts)
                x_this_modapts = []
                y_list.append(label_before)
                
            x_this_modapts.append(line)
            label_before = label

    return x_list, y_list


def main():
    """_summary_ 
        Overlap frames and generate training data.
    """

    x_list, y_list = cut_btw_modaps()
    

    x_train, x_test, y_train, y_test = train_test_split(x_list, y_list, shuffle=False, test_size=TEST_SIZE)
    x_train, x_val, y_train, y_val = train_test_split(x_train, y_train, shuffle=False, test_size=VAL_SIZE)
    
    for path in [x_train_path, y_train_path, x_test_path, y_test_path, x_val_path, y_val_path]:
        if os.path.isfile(path): os.remove(path)

    with open(x_train_path, 'w') as x_train_file, open(y_train_path, 'w') as y_train_file:
        for x_this_modapts, label in zip(x_train, y_train):
            for i in range(0, len(x_this_modapts), FRAME_COUNT - OVERLAP):
                if (i + FRAME_COUNT > len(x_this_modapts)):
                    break
                for j in range(i, FRAME_COUNT + i):
                    x_train_file.write(x_this_modapts[j])
                y_train_file.write(label)

    with open(x_test_path, 'w') as x_test_file, open(y_test_path, 'w') as y_test_file:
        for x_this_modapts, label in zip(x_test, y_test):
            for i in range(0, len(x_this_modapts), FRAME_COUNT - OVERLAP):
                if (i + FRAME_COUNT > len(x_this_modapts)):
                    break
                for j in range(i, FRAME_COUNT + i):
                    x_test_file.write(x_this_modapts[j])
                y_test_file.write(label)
    
    with open(x_val_path, 'w') as x_val_file, open(y_val_path, 'w') as y_val_file:
        for x_this_modapts, label in zip(x_val, y_val):
            for i in range(0, len(x_this_modapts), FRAME_COUNT - OVERLAP):
                if (i + FRAME_COUNT > len(x_this_modapts)):
                    break
                for j in range(i, FRAME_COUNT + i):
                    x_val_file.write(x_this_modapts[j])
                y_val_file.write(label)
                
                
if __name__ == '__main__':
    main()