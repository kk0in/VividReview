import numpy as np
from sklearn.model_selection import StratifiedShuffleSplit
from sklearn.model_selection import train_test_split
import os
from sklearn.preprocessing import StandardScaler
import joblib
from datetime import datetime



# labels_mx_topk = ['M3', 'G1', 'M1', 'M2', 'P2', 'R2', 'A2', 'BG']
# labels_mx_topk_wo = ['M', 'G', 'P', 'R']
# labels = labels_mx_topk


def cut_btw_modaps(x_raw_path, y_raw_path):
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
    prev_path = "./assets/feature/raw/"
    new_path =  "./assets/overlap/features/"
    frame_count = 8 # the number of frames in each overlapped video clips
    overlap = 6 # how many frames be overlapped between two adjacent video clips
    # for example, if frame_count = 6 and overlap = 4, then the first video clip will be 1-6, the second will be 3-8, the third will be 5-10, etc.

    test_size = 0.1
    val_size = 0.1
    run_overlap(prev_path, new_path, frame_count, overlap, val_size, test_size)


def run_overlap(prev_path, new_path, frame_count, overlap, val_size, test_size):
    """_summary_ 
        overlap frames and generate training data.
    """
    
    os.makedirs(prev_path, exist_ok=True)
    os.makedirs(new_path, exist_ok=True)

    x_raw_path = prev_path + "X_raw.csv"
    x_train_path = new_path + "X_train.csv"
    x_test_path = new_path + "X_test.csv"
    x_val_path = new_path + "X_val.csv"

    y_raw_path = prev_path + "Y_raw.csv"
    y_train_path = new_path + "Y_train.csv"
    y_test_path = new_path + "Y_test.csv"
    y_val_path = new_path + "Y_val.csv"

    x_list, y_list = cut_btw_modaps(x_raw_path, y_raw_path)
    
    if val_size >0 and test_size>0:
        x_train, x_val, y_train, y_val = train_test_split(x_list, y_list, shuffle=False, test_size=val_size)
        x_train, x_test, y_train, y_test = train_test_split(x_train, y_train, shuffle=False, test_size=test_size)
    else:
        x_train = x_list
        y_train = y_list
        
    for path in [x_train_path, y_train_path, x_test_path, y_test_path, x_val_path, y_val_path]:
        if os.path.isfile(path): os.remove(path)

    with open(x_train_path, 'w') as x_train_file, open(y_train_path, 'w') as y_train_file:
        for x_this_modapts, label in zip(x_train, y_train):
            for i in range(0, len(x_this_modapts), frame_count - overlap):
                if (i + frame_count > len(x_this_modapts)):
                    break
                for j in range(i, frame_count + i):
                    x_train_file.write(x_this_modapts[j])
                y_train_file.write(label)

    if val_size >0 and test_size>0:
        with open(x_test_path, 'w') as x_test_file, open(y_test_path, 'w') as y_test_file:
            for x_this_modapts, label in zip(x_test, y_test):
                for i in range(0, len(x_this_modapts), frame_count - overlap):
                    if (i + frame_count > len(x_this_modapts)):
                        break
                    for j in range(i, frame_count + i):
                        x_test_file.write(x_this_modapts[j])
                    y_test_file.write(label)
        
        with open(x_val_path, 'w') as x_val_file, open(y_val_path, 'w') as y_val_file:
            for x_this_modapts, label in zip(x_val, y_val):
                for i in range(0, len(x_this_modapts), frame_count - overlap):
                    if (i + frame_count > len(x_this_modapts)):
                        break
                    for j in range(i, frame_count + i):
                        x_val_file.write(x_this_modapts[j])
                    y_val_file.write(label)
                     
if __name__ == '__main__':
    main()