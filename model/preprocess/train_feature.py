import os 
import json
import math
import pickle
import csv

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

change_part = [RIGHT_ELBOW, RIGHT_WRIST, RIGHT_HAND_ROOT, RIGHT_THUMB1, RIGHT_THUMB2, RIGHT_THUMB3, RIGHT_THUMB4, RIGHT_FOREFINGER1, RIGHT_FOREFINGER2, RIGHT_FOREFINGER3, RIGHT_FOREFINGER4, RIGHT_MIDDLE_FINGER1, RIGHT_MIDDLE_FINGER2, RIGHT_MIDDLE_FINGER3, RIGHT_MIDDLE_FINGER4, RIGHT_RING_FINGER1, RIGHT_RING_FINGER2, RIGHT_RING_FINGER3, RIGHT_RING_FINGER4, RIGHT_PINKY_FINGER1, RIGHT_PINKY_FINGER2, RIGHT_PINKY_FINGER3, RIGHT_PINKY_FINGER4, LEFT_ELBOW, LEFT_WRIST, LEFT_HAND_ROOT, LEFT_THUMB1, LEFT_THUMB2, LEFT_THUMB3, LEFT_THUMB4, LEFT_FOREFINGER1, LEFT_FOREFINGER2, LEFT_FOREFINGER3, LEFT_FOREFINGER4, LEFT_MIDDLE_FINGER1, LEFT_MIDDLE_FINGER2, LEFT_MIDDLE_FINGER3, LEFT_MIDDLE_FINGER4, LEFT_RING_FINGER1, LEFT_RING_FINGER2, LEFT_RING_FINGER3, LEFT_RING_FINGER4, LEFT_PINKY_FINGER1, LEFT_PINKY_FINGER2, LEFT_PINKY_FINGER3, LEFT_PINKY_FINGER4]
change_pair = [RIGHT_SHOULDER, RIGHT_ELBOW, 
               RIGHT_ELBOW, RIGHT_WRIST, 
               RIGHT_WRIST, RIGHT_HAND_ROOT, 
               RIGHT_HAND_ROOT, RIGHT_THUMB1, 
               RIGHT_THUMB1, RIGHT_THUMB2, 
               RIGHT_THUMB2, RIGHT_THUMB3, 
               RIGHT_THUMB3, RIGHT_THUMB4, 
               RIGHT_HAND_ROOT, RIGHT_FOREFINGER1, 
               RIGHT_FOREFINGER1, RIGHT_FOREFINGER2, 
               RIGHT_FOREFINGER2, RIGHT_FOREFINGER3, 
               RIGHT_FOREFINGER3, RIGHT_FOREFINGER4, 
               RIGHT_HAND_ROOT, RIGHT_MIDDLE_FINGER1, 
               RIGHT_MIDDLE_FINGER1, RIGHT_MIDDLE_FINGER2, 
               RIGHT_MIDDLE_FINGER2, RIGHT_MIDDLE_FINGER3, 
               RIGHT_MIDDLE_FINGER3, RIGHT_MIDDLE_FINGER4, 
               RIGHT_HAND_ROOT, RIGHT_RING_FINGER1, 
               RIGHT_RING_FINGER1, RIGHT_RING_FINGER2, 
               RIGHT_RING_FINGER2, RIGHT_RING_FINGER3, 
               RIGHT_RING_FINGER3, RIGHT_RING_FINGER4, 
               RIGHT_HAND_ROOT, RIGHT_PINKY_FINGER1, 
               RIGHT_PINKY_FINGER1, RIGHT_PINKY_FINGER2, 
               RIGHT_PINKY_FINGER2, RIGHT_PINKY_FINGER3, 
               RIGHT_PINKY_FINGER3, RIGHT_PINKY_FINGER4, 
               LEFT_SHOULDER, LEFT_ELBOW, 
               LEFT_ELBOW, LEFT_WRIST, 
               LEFT_WRIST, LEFT_HAND_ROOT, 
               LEFT_HAND_ROOT, LEFT_THUMB1, 
               LEFT_THUMB1, LEFT_THUMB2, 
               LEFT_THUMB2, LEFT_THUMB3, 
               LEFT_THUMB3, LEFT_THUMB4, 
               LEFT_HAND_ROOT, LEFT_FOREFINGER1, 
               LEFT_FOREFINGER1, LEFT_FOREFINGER2, 
               LEFT_FOREFINGER2, LEFT_FOREFINGER3, 
               LEFT_FOREFINGER3, LEFT_FOREFINGER4, 
               LEFT_HAND_ROOT, LEFT_MIDDLE_FINGER1, 
               LEFT_MIDDLE_FINGER1, LEFT_MIDDLE_FINGER2, 
               LEFT_MIDDLE_FINGER2, LEFT_MIDDLE_FINGER3, 
               LEFT_MIDDLE_FINGER3, LEFT_MIDDLE_FINGER4, 
               LEFT_HAND_ROOT, LEFT_RING_FINGER1, 
               LEFT_RING_FINGER1, LEFT_RING_FINGER2, 
               LEFT_RING_FINGER2, LEFT_RING_FINGER3, 
               LEFT_RING_FINGER3, LEFT_RING_FINGER4, 
               LEFT_HAND_ROOT, LEFT_PINKY_FINGER1, 
               LEFT_PINKY_FINGER1, LEFT_PINKY_FINGER2, 
               LEFT_PINKY_FINGER2, LEFT_PINKY_FINGER3, 
               LEFT_PINKY_FINGER3, LEFT_PINKY_FINGER4]


labels_mx_topk = ['M3', 'G1', 'M1', 'M2', 'P2', 'R2', 'A2', 'BG']
labels_mx_topk_wo = ['M', 'G', 'P', 'R', 'A', 'BG']

dist_dic = {'0701_MX_0001': 327.29605716722875, '0701_MX_0002': 337.8149799059089, '0701_MX_0003': 342.82928728718804, '0701_MX_0004': 345.6524830913372, '0707_MX_0001': 305.3282361763116, '0707_MX_0002': 351.68448105305936, '0707_MX_0003': 323.7594350962371, '0707_MX_0004': 297.96658218571497, '0714_MX_0001': 253.75454345681757, '0714_MX_0002': 327.72359341151486, '0714_MX_0003': 366.3059702455931, '0721_MX_0001': 284.89477031860423, '0721_MX_0002': 292.61099491541233, '0721_MX_0003': 366.2456829279402, '0721_MX_0004': 294.5088006199761, '0721_MX_0005': 278.7827992896253, '0729_MX_0001': 226.1348980725326, '0729_MX_0002': 245.1382931677766, '0804_MX_0001': 300.95501724123636, '0804_MX_0002': 276.21455425945635, '0816_MX_0001': 225.19156811287934}
sep_info_dic = {'train': ['0701_MX_0001', '0701_MX_0002', '0701_MX_0003', '0707_MX_0001', '0707_MX_0004', '0714_MX_0001', '0714_MX_0002', '0714_MX_0003', '0721_MX_0001', '0721_MX_0004', '0721_MX_0005', '0729_MX_0001', '0729_MX_0002', '0804_MX_0001', '0804_MX_0002', '0816_MX_0001'], 'test': ['0707_MX_0002', '0707_MX_0003'], 'val': ['0701_MX_0004', '0721_MX_0002']}
sep = ['train', 'test', 'val']

json_dir =  '/home/samsung/data_link/samsung/sec/RAW_0824/'
DATA_PATH = '/data/minsuk/SEC-ST/model/preprocess/assets/train/new_fv' 

def createDirectory(directory):
    try:
        if not os.path.exists(directory):
            os.makedirs(directory)
    except OSError:
        print("Error: Failed to create the directory.")

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

for s in sep:
    TXT_PATH = DATA_PATH + f'{s}/'
    X_FV_PKL_PATH = DATA_PATH + 'X_pkl/'
    Y_FV_PKL_PATH = DATA_PATH + 'Y_pkl/'
    Y_FV_PKL_WO_PATH = DATA_PATH + 'Y_wo_pkl/'
    X_FV_CSV_PATH = DATA_PATH + 'X_csv/'
    Y_FV_CSV_PATH = DATA_PATH + 'Y_csv/'
    Y_FV_CSV_WO_PATH = DATA_PATH + 'Y_wo_csv/'

    PATH_LIST = [DATA_PATH, TXT_PATH, X_FV_PKL_PATH, Y_FV_PKL_PATH, Y_FV_PKL_WO_PATH, X_FV_CSV_PATH, Y_FV_CSV_PATH, Y_FV_CSV_WO_PATH]

    for i in PATH_LIST:
        createDirectory(i)

    json_list = []
    target_sep = sep_info_dic[s]

    for (root, directories, files) in os.walk(json_dir):
        if root.split('/')[-1].split('_')[0] == 'result':
            for file in files:
                video_name = file[:12]
                if video_name not in target_sep:
                    continue
                file_path = os.path.join(root, file)
                json_list.append(file_path)

    tp = open(os.path.join(TXT_PATH + f'X_{s}.pkl'), 'wb')
    yp = open(os.path.join(TXT_PATH + f'Y_{s}.pkl'), 'wb')
    yp_wo = open(os.path.join(TXT_PATH + f'Y_{s}_wo.pkl'), 'wb')

    tc = open(os.path.join(TXT_PATH + f'X_{s}.csv'), 'w', newline='')
    yc = open(os.path.join(TXT_PATH + f'Y_{s}.csv'), 'w', newline='')
    yc_wo = open(os.path.join(TXT_PATH + f'Y_{s}_wo.csv'), 'w', newline='')

    x_total = []
    y_total = []
    y_wo_total = []

    for file in json_list:
        x_file = []
        y_file = []
        y_wo_file = []
        
        file_name = file.split('/')[-1].split('.')[0]
        video_name = file_name[:12]
        label = file.split('_')[-1].split('.')[0]

        t1 = open(os.path.join(X_FV_PKL_PATH + f'X_fv_{file_name}.pkl'), 'wb')
        y1 = open(os.path.join(Y_FV_PKL_PATH + f'Y_fv_{file_name}.pkl'), 'wb')
        y1_wo = open(os.path.join(Y_FV_PKL_WO_PATH + f'Y_fv_wo_{file_name}.pkl'), 'wb')

        t2 = open(os.path.join(X_FV_CSV_PATH + f'X_fv_{file_name}.csv'), 'w', newline='')
        y2 = open(os.path.join(Y_FV_CSV_PATH + f'Y_fv_{file_name}.csv'), 'w', newline='')
        y2_wo = open(os.path.join(Y_FV_CSV_WO_PATH + f'Y_fv_wo_{file_name}.csv'), 'w', newline='')

        if label not in labels_mx_topk:
            label = 'BG'

        with open(file, 'r') as f:
            try:
                json_data = json.load(f)
            except:
                continue
        
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
                # dist_list.append(abs(get_dist(j[part*2], n_j[part*2], j[part*2+1], n_j[part*2+1])))
                dist_list.append(abs(get_dist(j[part*2], j[part*2+1], n_j[part*2], n_j[part*2+1]) / dist_dic[video_name]))

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
            #     if i!=0:
            #         t.write(',')
            #     t.write(str(dist_list[i]))
            #     t.write(',')
            #     t.write(str(deg_list[i]))
            #     t.write(',')
            #     t.write(str(cur_deg_list[i]))

            #     if i!=0:
            #         t1.write(',')
            #     t1.write(str(dist_list[i]))
            #     t1.write(',')
            #     t1.write(str(deg_list[i]))
            #     t1.write(',')
            #     t1.write(str(cur_deg_list[i]))
            x_file.append(fv)
            x_total.append(fv)

            y_file.append([labels_mx_topk.index(label)])
            y_total.append([labels_mx_topk.index(label)])
            newstring = ''.join([i for i in label if not i.isdigit()])
            y_wo_file.append([labels_mx_topk_wo.index(newstring)])
            y_wo_total.append([labels_mx_topk_wo.index(newstring)])
            # y1.write(str(labels_mx_topk.index(label)))
            # y.write(str(labels_mx_topk.index(label)))
            # newstring = ''.join([i for i in label if not i.isdigit()])
            # y1_wo.write(str(labels_mx_topk_wo.index(newstring)))
            # y_wo.write(str(labels_mx_topk_wo.index(newstring)))

            
            # t.write('\n')
            # y.write('\n')
            # y_wo.write('\n')
            # t1.write('\n')
            # y1.write('\n')
            # y1_wo.write('\n')

        pickle.dump(x_file, t1)
        pickle.dump(y_file, y1)
        pickle.dump(y_wo_file, y1_wo)
        csv.writer(t2).writerows(x_file)
        csv.writer(y2).writerows(y_file)
        csv.writer(y2_wo).writerows(y_wo_file)
        
        t1.close()
        y1.close()
        y1_wo.close()
        t2.close()
        y2.close()
        y2_wo.close()
            

    pickle.dump(x_total, tp)
    pickle.dump(y_total, yp)
    pickle.dump(y_wo_total, yp_wo)
    csv.writer(tc).writerows(x_total)
    csv.writer(yc).writerows(y_total)
    csv.writer(yc_wo).writerows(y_wo_total)      
    tp.close()
    yp.close()
    yp_wo.close()
    tc.close()
    yc.close()
    yc_wo.close()

