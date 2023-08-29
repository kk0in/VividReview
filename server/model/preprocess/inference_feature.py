import os 
import json
import math
import pickle
import csv
from glob import glob
from tqdm import tqdm
import parmap
import numpy as np

NOSE = 0
LEFT_EYE = 1
RIGHT_EYE = 2
LEFT_EAR = 3
RIGHT_EAR = 4

LEFT_SHOULDER = 5
RIGHT_SHOULDER = 6
LEFT_ELBOW = 7
RIGHT_ELBOW = 8
LEFT_WRIST = 9
RIGHT_WRIST = 10

LEFT_HIP = 11
RIGHT_HIP = 12
LEFT_KNEE = 13
RIGHT_KNEE = 14
LEFT_ANKLE = 15
RIGHT_ANKLE = 16
LEFT_BIG_TOE = 17
LEFT_SMALL_TOE = 18
LEFT_HEEL = 19
RIGHT_BIG_TOE = 20
RIGHT_SMALL_TOE = 21
RIGHT_HEEL = 22
FACE_0 = 23
FACE_1 = 24
FACE_2 = 25
FACE_3 = 26
FACE_4 = 27
FACE_5 = 28
FACE_6 = 29
FACE_7 = 30
FACE_8 = 31
FACE_9 = 32
FACE_10 = 33
FACE_11 = 34
FACE_12 = 35
FACE_13 = 36
FACE_14 = 37
FACE_15 = 38
FACE_16 = 39
FACE_17 = 40
FACE_18 = 41
FACE_19 = 42
FACE_20 = 43
FACE_21 = 44
FACE_22 = 45
FACE_23 = 46
FACE_24 = 47
FACE_25 = 48
FACE_26 = 49
FACE_27 = 50
FACE_28 = 51
FACE_29 = 52
FACE_30 = 53
FACE_31 = 54
FACE_32 = 55
FACE_33 = 56
FACE_34 = 57
FACE_35 = 58
FACE_36 = 59
FACE_37 = 60
FACE_38 = 61
FACE_39 = 62
FACE_40 = 63
FACE_41 = 64
FACE_42 = 65
FACE_43 = 66
FACE_44 = 67
FACE_45 = 68
FACE_46 = 69
FACE_47 = 70
FACE_48 = 71
FACE_49 = 72
FACE_50 = 73
FACE_51 = 74
FACE_52 = 75
FACE_53 = 76
FACE_54 = 77
FACE_55 = 78
FACE_56 = 79
FACE_57 = 80
FACE_58 = 81
FACE_59 = 82
FACE_60 = 83
FACE_61 = 84
FACE_62 = 85
FACE_63 = 86
FACE_64 = 87
FACE_65 = 88
FACE_66 = 89
FACE_67 = 90

LEFT_HAND_ROOT = 91
LEFT_THUMB1 = 92
LEFT_THUMB2 = 93
LEFT_THUMB3 = 94
LEFT_THUMB4 = 95
LEFT_FOREFINGER1 = 96
LEFT_FOREFINGER2 = 97
LEFT_FOREFINGER3 = 98
LEFT_FOREFINGER4 = 99
LEFT_MIDDLE_FINGER1 = 100
LEFT_MIDDLE_FINGER2 = 101
LEFT_MIDDLE_FINGER3 = 102
LEFT_MIDDLE_FINGER4 = 103
LEFT_RING_FINGER1 = 104
LEFT_RING_FINGER2 = 105
LEFT_RING_FINGER3 = 106
LEFT_RING_FINGER4 = 107
LEFT_PINKY_FINGER1 = 108
LEFT_PINKY_FINGER2 = 109
LEFT_PINKY_FINGER3 = 110
LEFT_PINKY_FINGER4 = 111
RIGHT_HAND_ROOT = 112
RIGHT_THUMB1 = 113
RIGHT_THUMB2 = 114
RIGHT_THUMB3 = 115
RIGHT_THUMB4 = 116
RIGHT_FOREFINGER1 = 117
RIGHT_FOREFINGER2 = 118
RIGHT_FOREFINGER3 = 119
RIGHT_FOREFINGER4 = 120
RIGHT_MIDDLE_FINGER1 = 121
RIGHT_MIDDLE_FINGER2 = 122
RIGHT_MIDDLE_FINGER3 = 123
RIGHT_MIDDLE_FINGER4 = 124
RIGHT_RING_FINGER1 = 125
RIGHT_RING_FINGER2 = 126
RIGHT_RING_FINGER3 = 127
RIGHT_RING_FINGER4 = 128
RIGHT_PINKY_FINGER1 = 129
RIGHT_PINKY_FINGER2 = 130
RIGHT_PINKY_FINGER3 = 131
RIGHT_PINKY_FINGER4 = 132

def get_dist(x1, y1, x2, y2):
    if x1==0 or x2==0:
        return 0.0
    else:
        return math.sqrt((x2 - x1)**2 + (y2 - y1)**2)

def get_deg(x1, y1, x2, y2):
    if x1==0 or x2==0:
        return 0.0
    dx = x2 - x1
    dy = y2 - y1
    rad = math.atan2(dy, dx)
    degree = (rad * 180) / math.pi
    if degree < 0:
        degree += 360

    return degree

def get_meanDist(json_file, j1=LEFT_SHOULDER, j2=RIGHT_SHOULDER):
    dist = []
    with open(json_file, 'r') as f:
        json_data = json.load(f)
        frames = json_data["instance_info"]

        for i in range(len(frames)):
            try:
                kp = frames[i]["instances"][0]["keypoints"]
            except:
                continue
            
            xls, yls = kp[j1][0], kp[j1][1]
            xrs, yrs = kp[j2][0], kp[j2][1]
            
            dist.append(get_dist(xls, yls, xrs, yrs))

    return np.mean(np.mean(dist))

change_part = [RIGHT_ELBOW, RIGHT_WRIST, RIGHT_HAND_ROOT, RIGHT_THUMB1, RIGHT_THUMB2, RIGHT_THUMB3, RIGHT_THUMB4, RIGHT_FOREFINGER1, RIGHT_FOREFINGER2, RIGHT_FOREFINGER3, RIGHT_FOREFINGER4, RIGHT_MIDDLE_FINGER1, RIGHT_MIDDLE_FINGER2, RIGHT_MIDDLE_FINGER3, RIGHT_MIDDLE_FINGER4, RIGHT_RING_FINGER1, RIGHT_RING_FINGER2, RIGHT_RING_FINGER3, RIGHT_RING_FINGER4, RIGHT_PINKY_FINGER1, RIGHT_PINKY_FINGER2, RIGHT_PINKY_FINGER3, RIGHT_PINKY_FINGER4, LEFT_ELBOW, LEFT_WRIST, LEFT_HAND_ROOT, LEFT_THUMB1, LEFT_THUMB2, LEFT_THUMB3, LEFT_THUMB4, LEFT_FOREFINGER1, LEFT_FOREFINGER2, LEFT_FOREFINGER3, LEFT_FOREFINGER4, LEFT_MIDDLE_FINGER1, LEFT_MIDDLE_FINGER2, LEFT_MIDDLE_FINGER3, LEFT_MIDDLE_FINGER4, LEFT_RING_FINGER1, LEFT_RING_FINGER2, LEFT_RING_FINGER3, LEFT_RING_FINGER4, LEFT_PINKY_FINGER1, LEFT_PINKY_FINGER2, LEFT_PINKY_FINGER3, LEFT_PINKY_FINGER4]
change_pair = [RIGHT_SHOULDER, RIGHT_ELBOW, RIGHT_ELBOW, RIGHT_WRIST, RIGHT_WRIST, RIGHT_HAND_ROOT, RIGHT_HAND_ROOT, RIGHT_THUMB1, RIGHT_THUMB1, RIGHT_THUMB2, RIGHT_THUMB2, RIGHT_THUMB3, RIGHT_THUMB3, RIGHT_THUMB4, RIGHT_HAND_ROOT, RIGHT_FOREFINGER1, RIGHT_FOREFINGER1, RIGHT_FOREFINGER2, RIGHT_FOREFINGER2, RIGHT_FOREFINGER3, RIGHT_FOREFINGER3, RIGHT_FOREFINGER4, RIGHT_HAND_ROOT, RIGHT_MIDDLE_FINGER1, RIGHT_MIDDLE_FINGER1, RIGHT_MIDDLE_FINGER2, RIGHT_MIDDLE_FINGER2, RIGHT_MIDDLE_FINGER3, RIGHT_MIDDLE_FINGER3, RIGHT_MIDDLE_FINGER4, RIGHT_HAND_ROOT, RIGHT_RING_FINGER1, RIGHT_RING_FINGER1, RIGHT_RING_FINGER2, RIGHT_RING_FINGER2, RIGHT_RING_FINGER3, RIGHT_RING_FINGER3, RIGHT_RING_FINGER4, RIGHT_HAND_ROOT, RIGHT_PINKY_FINGER1, RIGHT_PINKY_FINGER1, RIGHT_PINKY_FINGER2, RIGHT_PINKY_FINGER2, RIGHT_PINKY_FINGER3, RIGHT_PINKY_FINGER3, RIGHT_PINKY_FINGER4, LEFT_SHOULDER, LEFT_ELBOW, LEFT_ELBOW, LEFT_WRIST, LEFT_WRIST, LEFT_HAND_ROOT, LEFT_HAND_ROOT, LEFT_THUMB1, LEFT_THUMB1, LEFT_THUMB2, LEFT_THUMB2, LEFT_THUMB3, LEFT_THUMB3, LEFT_THUMB4, LEFT_HAND_ROOT, LEFT_FOREFINGER1, LEFT_FOREFINGER1, LEFT_FOREFINGER2, LEFT_FOREFINGER2, LEFT_FOREFINGER3, LEFT_FOREFINGER3, LEFT_FOREFINGER4, LEFT_HAND_ROOT, LEFT_MIDDLE_FINGER1, LEFT_MIDDLE_FINGER1, LEFT_MIDDLE_FINGER2, LEFT_MIDDLE_FINGER2, LEFT_MIDDLE_FINGER3, LEFT_MIDDLE_FINGER3, LEFT_MIDDLE_FINGER4, LEFT_HAND_ROOT, LEFT_RING_FINGER1, LEFT_RING_FINGER1, LEFT_RING_FINGER2, LEFT_RING_FINGER2, LEFT_RING_FINGER3, LEFT_RING_FINGER3, LEFT_RING_FINGER4, LEFT_HAND_ROOT, LEFT_PINKY_FINGER1, LEFT_PINKY_FINGER1, LEFT_PINKY_FINGER2, LEFT_PINKY_FINGER2, LEFT_PINKY_FINGER3, LEFT_PINKY_FINGER3, LEFT_PINKY_FINGER4]

labels_mx_topk = ['M3', 'G1', 'M1', 'M2', 'P2', 'R2', 'A2', 'BG']
labels_mx_topk_wo = ['M', 'G', 'P', 'R', 'A', 'BG']

def run_feature_extraction(json_file:str, target_folder:str)->str:
    """ Extract features from json_file and save it to target_folder

    :param json_file: pose extracted json file
    :type json_file: str
    :param target_folder: temporary folder
    :type target_folder: str
    :return: extracted feature's csv path
    :rtype: str
    """

    FV = os.path.join(target_folder, 'feature_vectors')
    os.makedirs(FV, exist_ok=True)
    
    video_name = os.path.basename(json_file).split(".")[0]
    global DATA_PATH, TXT_PATH, X_FV_PKL_PATH, X_FV_CSV_PATH
    TXT_PATH = DATA_PATH = FV
    X_FV_PKL_PATH = os.path.join(TXT_PATH, 'X_pkl/')
    X_FV_CSV_PATH = os.path.join(TXT_PATH, 'X_csv/')

    PATH_LIST = [TXT_PATH, X_FV_PKL_PATH, X_FV_CSV_PATH]
    for path in PATH_LIST:
        os.makedirs(path, exist_ok=True)
    
    x_file = []
    
    feature_csv_path = os.path.join(X_FV_CSV_PATH + f'{video_name}.csv')
    feature_pkl_path = os.path.join(X_FV_PKL_PATH + f'{video_name}.pkl')
    t1 = open(feature_pkl_path, 'wb')
    t2 = open(feature_csv_path, 'w', newline='')
    
    mean_dist = get_meanDist(json_file)
    
    with open(json_file, 'r') as f:
        try:
            json_data = json.load(f)
        except:
            print("ERROR: json data parsing error")
    
    instances = json_data["instance_info"]
    for ins in range(len(instances)-1):
        dist_list = []
        deg_list = []
        cur_deg_list = []
        
        j = []
        n_j = []

        try:
            k = instances[ins]["instances"][0]["keypoints"]
            n_k = instances[ins+1]["instances"][0]["keypoints"]
        except:
            continue

        for i in range(len(k)):
            j.append(k[i][0])
            j.append(k[i][1])
            n_j.append(n_k[i][0])
            n_j.append(n_k[i][1])
        
        for i in range(len(change_part)):
            part = change_part[i]
            dist_list.append(abs(get_dist(j[part*2], j[part*2+1], n_j[part*2], n_j[part*2+1]) / mean_dist))

            pair_1 = change_pair[i * 2]
            pair_2 = change_pair[i * 2 + 1]

            deg = get_deg(j[pair_1*2], j[pair_1*2+1], j[pair_2*2], j[pair_2*2+1])
            n_deg = get_deg(n_j[pair_1*2], n_j[pair_1*2+1], n_j[pair_2*2], n_j[pair_2*2+1])

            cur_deg_list.append(n_deg)

            if deg==0 or n_deg==0:
                deg_list.append(0.0)
            else:
                deg_list.append(abs(deg-n_deg))

        fv = []
        for i in range(len(change_part)):
            fv.append(dist_list[i])
            fv.append(deg_list[i])
            fv.append(cur_deg_list[i])

        x_file.append(fv)

    pickle.dump(x_file, t1)
    csv.writer(t2).writerows(x_file)

    t1.close()
    t2.close()
    
    return feature_csv_path


if __name__ == '__main__':
    json_path = "~~~.json"
    target_folder = './assets/feature/' 
    run_feature_extraction(json_path, target_folder)