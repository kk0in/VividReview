import numpy as np
from sklearn.model_selection import StratifiedShuffleSplit
from sklearn.model_selection import train_test_split
import os
from sklearn.preprocessing import StandardScaler
import joblib
from datetime import datetime
from tqdm import tqdm



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
    for folder in ['features', "keypoints"]:
        for type in tqdm(["train", "val", "test"]):
            prev_X_path = f"./assets/train/{folder}/{type}/X_{type}.csv"
            prev_Y_path = f"./assets/train/{folder}/{type}/Y_{type}.csv"
            new_X_path =  f"./assets/train/overlap/{folder}/X_{type}.csv"
            new_Y_path =  f"./assets/train/overlap/{folder}/Y_{type}.csv"
            
            frame_count = 8 # the number of frames in each overlapped video clips
            overlap = 6 # how many frames be overlapped between two adjacent video clips
            # for example, if frame_count = 6 and overlap = 4, then the first video clip will be 1-6, the second will be 3-8, the third will be 5-10, etc.

            run_overlap(prev_X_path, prev_Y_path, new_X_path, new_Y_path, frame_count, overlap)
            

def run_overlap(prev_X_path, prev_Y_path, new_X_path, new_Y_path, frame_count, overlap):
    """_summary_ 
        overlap frames and generate training data.
    """
    

    x_list, y_list = cut_btw_modaps(prev_X_path, prev_Y_path)
        
    for path in [new_X_path, new_Y_path]:
        if os.path.isfile(path): os.remove(path)

    with open(new_X_path, 'w') as x_file, open(new_Y_path, 'w') as y_file:
        for x_this_modapts, label in zip(x_list, y_list):
            for i in range(0, len(x_this_modapts), frame_count - overlap):
                if (i + frame_count > len(x_this_modapts)):
                    break
                for j in range(i, frame_count + i):
                    x_file.write(x_this_modapts[j])
                y_file.write(label)

if __name__ == '__main__':
    main()