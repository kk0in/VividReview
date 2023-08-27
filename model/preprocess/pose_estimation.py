"""
typedef struct mmdeploy_pose_tracker_param_t (
  // detection interval, default = 1
  int32_t det_interval;
  // detection label use for pose estimation, default = 0
  int32_t det_label;
  // detection score threshold, default = 0.5
  float det_thr;
  // detection minimum bbox size (compute as sqrt(area)), default = -1
  float det_min_bbox_size;
  // nms iou threshold for merging detected bboxes and bboxes from tracked targets, default = 0.7
  float det_nms_thr;

  // max number of bboxes used for pose estimation per frame, default = -1
  int32_t pose_max_num_bboxes;
  // threshold for visible key-points, default = 0.5
  float pose_kpt_thr;
  // min number of key-points for valid poses (-1 indicates ceil(n_kpts/2)), default = -1
  int32_t pose_min_keypoints;
  // scale for expanding key-points to bbox, default = 1.25
  float pose_bbox_scale;
  // min pose bbox size, tracks with bbox size smaller than the threshold will be dropped,
  // default = -1
  float pose_min_bbox_size;
  // nms oks/iou threshold for suppressing overlapped poses, useful when multiple pose estimations
  // collapse to the same target, default = 0.5
  float pose_nms_thr;
  // keypoint sigmas for computing OKS, will use IOU if not set, default = nullptr
  float* keypoint_sigmas;
  // size of keypoint sigma array, must be consistent with the number of key-points, default = 0
  int32_t keypoint_sigmas_size;

  // iou threshold for associating missing tracks, default = 0.4
  float track_iou_thr;
  // max number of missing frames before a missing tracks is removed, default = 10
  int32_t track_max_missing;
  // track history size, default = 1
  int32_t track_history_size;

  // weight of position for setting covariance matrices of kalman filters, default = 0.05
  float std_weight_position;
  // weight of velocity for setting covariance matrices of kalman filters, default = 0.00625
  float std_weight_velocity;

  // params for the one-euro filter for smoothing the outputs - (beta, fc_min, fc_derivative)
  // default = (0.007, 1, 1)
  float smooth_params[3];
) mmdeploy_pose_tracker_param_t;
"""

from typing import Union, List
import argparse
import os
import json

from mmdeploy_runtime import PoseTracker
from imutils.video import FileVideoStream
from tqdm import tqdm
import cv2
# from imutils.video import FPS

model_path = dir_path = os.path.dirname(os.path.realpath(__file__)).replace('preprocess', "model/rtmpose-trt")

def parse_args():
    parser = argparse.ArgumentParser(
        description='RTMPose Python API'
    )
    parser.add_argument('input_video')
    parser.add_argument('output_path')
    

    args = parser.parse_args()

    return args


def input_process(input_video):
    if os.path.isdir(input_video):
        print(f"[INFO] Input is a Directory. Processing all videos in {input_video}")

        file_list = []
        
        for root, dirs, files in os.walk(input_video):
            for file in files:
                if file.endswith(".mp4"):
                    file_list.append(os.path.join(root, file))

    else:
        print(f"[INFO] Input is a Video. Processing {input_video}")
        file_list = [input_video]

    file_list.sort()

    return file_list


def frame_process(results, frame_id):
    keypoints, bboxes, _ = results
    # scores = keypoints[..., 2]
    keypoints = (keypoints[..., :2]).astype(float)

    instances = []

    for idx, keypoint in enumerate(keypoints):
        instance = {"keypoints": keypoint.tolist()}
        instances.append(instance)

    frame_info = {"frame_idx": frame_id, "instances": instances}

    return frame_info
    

def print_process_bar(frame_id, total_frames):
    bar_length = 50
    percentage = frame_id / total_frames
    block = int(round(bar_length * percentage))
    progress = "█" * block + "-" * (bar_length - block)
    print(f"\r{progress} {percentage*100:.2f}% | {frame_id}/{total_frames}", end="")
    if block == bar_length:
        print()

def get_total_frames(video):
    frames = []
    fvs = FileVideoStream(video).start()
    print("[FILE]", video)
    print("[INFO]Getting total frames...")
    while fvs.more():
        frame = fvs.read()
        if frame is None:
            break
        frames.append(frame)
    print("[INFO]Done getting total frames!")
    print("[INFO]Total frames:", len(frames))

    fvs.stop()

    return frames

# def get_total_frames(video):
#     cap = cv2.VideoCapture(video)

#     return cap.get(cv2.CAP_PROP_FRAME_COUNT)

def run(output_file_path, video, tracker, state):
    cap = cv2.VideoCapture(video)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.release()

    fvs = FileVideoStream(video).start()
    video_info = {"instance_info": []}
    frame_id = 0

    pbar = tqdm(total=total_frames, position=1, leave=False)

    while fvs.more():
        frame = fvs.read()
        if frame is None:
            break

        results = tracker(state, frame, detect=-1)

        frame_info = frame_process(results, frame_id)

        video_info["instance_info"].append(frame_info)

        frame_id += 1

        pbar.update(1)

    fvs.stop()

    # print(f"Elapsed time: {fps.elapsed():.2f}")  
    # print(f"Approx. FPS: {fps.fps():.2f}")  
    
    with open(output_file_path, "w") as f:
        json.dump(video_info, f, indent=4)

def main():
    args = parse_args()
    run_pose_estimation(args.input_video, args.output_path)


def run_pose_estimation(input_video:Union[str, List], output_path:Union[str, List])->Union[str, List]:
    """_summary_

    :param input_video: input video path(s)
    :type input_video: Union[str, List]
    :param output_path: output folder(s)
    :type output_path: Union[str, List]
    :return: output json path(s)
    :rtype: Union[str, List]
    """
    video_files = input_process(input_video)

    os.makedirs(output_path, exist_ok=True)

    coco_wholebody_sigmas = [
        0.026000000536441803,
        0.02500000037252903,
        0.02500000037252903,
        0.03500000014901161,
        0.03500000014901161,
        0.07900000363588333,
        0.07900000363588333,
        0.07199999690055847,
        0.07199999690055847,
        0.06199999898672104,
        0.06199999898672104,
        0.10700000077486038,
        0.10700000077486038,
        0.08699999749660492,
        0.08699999749660492,
        0.08900000154972076,
        0.08900000154972076,
        0.06800000369548798,
        0.06599999964237213,
        0.06599999964237213,
        0.09200000017881393,
        0.09399999678134918,
        0.09399999678134918,
        0.041999999433755875,
        0.0430000014603138,
        0.04399999976158142,
        0.0430000014603138,
        0.03999999910593033,
        0.03500000014901161,
        0.03099999949336052,
        0.02500000037252903,
        0.019999999552965164,
        0.023000000044703484,
        0.028999999165534973,
        0.03200000151991844,
        0.03700000047683716,
        0.03799999877810478,
        0.0430000014603138,
        0.04100000113248825,
        0.04500000178813934,
        0.013000000268220901,
        0.012000000104308128,
        0.010999999940395355,
        0.010999999940395355,
        0.012000000104308128,
        0.012000000104308128,
        0.010999999940395355,
        0.010999999940395355,
        0.013000000268220901,
        0.014999999664723873,
        0.008999999612569809,
        0.007000000216066837,
        0.007000000216066837,
        0.007000000216066837,
        0.012000000104308128,
        0.008999999612569809,
        0.00800000037997961,
        0.01600000075995922,
        0.009999999776482582,
        0.017000000923871994,
        0.010999999940395355,
        0.008999999612569809,
        0.010999999940395355,
        0.008999999612569809,
        0.007000000216066837,
        0.013000000268220901,
        0.00800000037997961,
        0.010999999940395355,
        0.012000000104308128,
        0.009999999776482582,
        0.03400000184774399,
        0.00800000037997961,
        0.00800000037997961,
        0.008999999612569809,
        0.00800000037997961,
        0.00800000037997961,
        0.007000000216066837,
        0.009999999776482582,
        0.00800000037997961,
        0.008999999612569809,
        0.008999999612569809,
        0.008999999612569809,
        0.007000000216066837,
        0.007000000216066837,
        0.00800000037997961,
        0.010999999940395355,
        0.00800000037997961,
        0.00800000037997961,
        0.00800000037997961,
        0.009999999776482582,
        0.00800000037997961,
        0.028999999165534973,
        0.02199999988079071,
        0.03500000014901161,
        0.03700000047683716,
        0.04699999839067459,
        0.026000000536441803,
        0.02500000037252903,
        0.024000000208616257,
        0.03500000014901161,
        0.017999999225139618,
        0.024000000208616257,
        0.02199999988079071,
        0.026000000536441803,
        0.017000000923871994,
        0.020999999716877937,
        0.020999999716877937,
        0.03200000151991844,
        0.019999999552965164,
        0.01899999938905239,
        0.02199999988079071,
        0.03099999949336052,
        0.028999999165534973,
        0.02199999988079071,
        0.03500000014901161,
        0.03700000047683716,
        0.04699999839067459,
        0.026000000536441803,
        0.02500000037252903,
        0.024000000208616257,
        0.03500000014901161,
        0.017999999225139618,
        0.024000000208616257,
        0.02199999988079071,
        0.026000000536441803,
        0.017000000923871994,
        0.020999999716877937,
        0.020999999716877937,
        0.03200000151991844,
        0.019999999552965164,
        0.01899999938905239,
        0.02199999988079071,
        0.03099999949336052
    ]
    
    tracker = PoseTracker(
        det_model=os.path.join(model_path, 'rtmdet-m'),
        pose_model=os.path.join(model_path, 'rtmpose-x'),
        device_name='cuda'
    )

    state = tracker.create_state(
        det_interval=1,
        det_thr=0.5,
        pose_nms_thr=0.3,
        keypoint_sigmas=coco_wholebody_sigmas
    )

    video_files_tqdm = tqdm(video_files, position=0)
    output_file_paths = []
    for idx, video in enumerate(video_files_tqdm):
        # print(f"[INFO] Processing {idx+1}/{len(video_files)}: {file}")
        output_file_path = os.path.join(output_path, f"{os.path.splitext(os.path.basename(video))[0]}.json")
        # run(output_file_path, video, tracker, state)
        output_file_paths.append(output_file_path)

    video_files_tqdm.close()
    if len(output_file_paths) == 1:
        return output_file_paths[0]
    else:
        return output_file_paths
    
if __name__ == '__main__':
    main()