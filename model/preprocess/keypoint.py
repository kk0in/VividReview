import os 
import json
import random
import pickle
import csv
from tqdm import tqdm

# json_dir =  '/data/samsung/sec/0816/result_0816_MX_0001'

face_index = [0, 1, 2, 3, 4, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90]
lowerbody_index = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]
labels_mx_topk = ['M3', 'G1', 'M1', 'M2', 'P2', 'R2', 'A2', 'BG']
labels_mx_topk_wo = ['M', 'G', 'P', 'R', 'A', 'BG']

sep_info_dic = {'train': ['0701_MX_0001', '0701_MX_0002', '0701_MX_0003', '0707_MX_0001', '0707_MX_0004', '0714_MX_0001', '0714_MX_0002', '0714_MX_0003', '0721_MX_0001', '0721_MX_0004', '0721_MX_0005', '0729_MX_0001', '0729_MX_0002', '0804_MX_0001', '0804_MX_0002', '0816_MX_0001'], 'test': ['0707_MX_0002', '0707_MX_0003'], 'val': ['0701_MX_0004', '0721_MX_0002']}
sep = ['train', 'test', 'val']

def run_keypoint_extraction(json_dir, target_path):
    """_summary_
    
        Extract keypoints from json_dir and save them to target_path

        json_dir = "/home/samsung/data_link/samsung/sec/FIN/Result"
        target_path = './assets/keypoints/' 
    """
    for s in sep:
        PATH_BASE = target_path
        TXT_PATH = PATH_BASE+f'{s}/'
        X_KP_PKL_PATH = PATH_BASE+'X_pkl/'
        Y_KP_PKL_PATH = PATH_BASE+'Y_pkl/'
        Y_KP_PKL_WO_PATH = PATH_BASE+'Y_wo_pkl/'
        X_KP_CSV_PATH = PATH_BASE+'X_csv/'
        Y_KP_CSV_PATH = PATH_BASE+'Y_csv/'
        Y_KP_CSV_WO_PATH = PATH_BASE+'Y_wo_csv/'

        for path in [TXT_PATH, X_KP_PKL_PATH, Y_KP_PKL_PATH,Y_KP_PKL_WO_PATH,X_KP_CSV_PATH ,Y_KP_CSV_PATH,Y_KP_CSV_WO_PATH]:
            os.makedirs(path, exist_ok=True)

        json_list = []
        target_sep = sep_info_dic[s]
        for (root, directories, files) in os.walk(json_dir):
            if root == json_dir:
                continue
            for file in files:
                video_name = file[:12]
                if video_name not in target_sep:
                    continue
                file_path = os.path.join(root, file)
                json_list.append(file_path)

        json_list.sort(key=lambda path: int(os.path.basename(path).split("_")[0])*100000+int(os.path.basename(path).split("_")[3]))

        tp = open(os.path.join(TXT_PATH + f'X_{s}.pkl'), 'wb')
        yp = open(os.path.join(TXT_PATH + f'Y_{s}.pkl'), 'wb')
        yp_wo = open(os.path.join(TXT_PATH + f'Y_{s}_wo.pkl'), 'wb')

        tc = open(os.path.join(TXT_PATH + f'X_{s}.csv'), 'w', newline='')
        yc = open(os.path.join(TXT_PATH + f'Y_{s}.csv'), 'w', newline='')
        yc_wo = open(os.path.join(TXT_PATH + f'Y_{s}_wo.csv'), 'w', newline='')

        x_total = []
        y_total = []
        y_wo_total = []

        for file in tqdm(json_list):
            x_file = []
            y_file = []
            y_wo_file = []

            file_name = file.split('/')[-1].split('.')[0]
            label = file.split('_')[-1].split('.')[0]

            t1 = open(os.path.join(X_KP_PKL_PATH + f'X_kp_{file_name}.pkl'), 'wb')
            y1 = open(os.path.join(Y_KP_PKL_PATH + f'Y_kp_{file_name}.pkl'), 'wb')
            y1_wo = open(os.path.join(Y_KP_PKL_WO_PATH + f'Y_kp_wo_{file_name}.pkl'), 'wb')

            t2 = open(os.path.join(X_KP_CSV_PATH + f'X_kp_{file_name}.csv'), 'w', newline='')
            y2 = open(os.path.join(Y_KP_CSV_PATH + f'Y_kp_{file_name}.csv'), 'w', newline='')
            y2_wo = open(os.path.join(Y_KP_CSV_WO_PATH + f'Y_kp_wo_{file_name}.csv'), 'w', newline='')

            if label not in labels_mx_topk:
                label = 'BG'

            with open(file, 'r') as f:
                try:
                    json_data = json.load(f)
                except:
                    continue
            # if labels_count[label] >= min_count:
            #     continue
            
            # labels_count[label] += 1
            
            instances = json_data["instance_info"]
            for ins in range(len(instances)-1):
                try:
                    keypoints = instances[ins]["instances"][0]["keypoints"]
                    next_keypoints = instances[ins+1]["instances"][0]["keypoints"]
                except:
                    continue
                kp = []
                for i in range(len(keypoints)):
                    kp.append(keypoints[i][0])
                    kp.append(keypoints[i][1])
                    
                for i in range(len(keypoints)):
                    kp.append(next_keypoints[i][0])
                    kp.append(next_keypoints[i][1])
                    
                x_file.append(kp)
                x_total.append(kp)

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


if __name__ == '__main__':
    json_dir = "/home/samsung/data_link/samsung/sec/FIN/Result/"
    target_path = './assets/train/keypoints/' 
    run_keypoint_extraction(json_dir, target_path)