import os
import json_tricks as json

import cv2
import mmcv
import mmengine
import numpy as np
from typing import Union, List
import argparse

from tqdm import tqdm

from mmpose.apis import inference_topdown
from mmpose.apis import init_model as init_pose_estimator
from mmpose.evaluation.functional import nms
from mmpose.registry import VISUALIZERS
from mmpose.structures import merge_data_samples, split_instances
from mmpose.utils import adapt_mmdet_pipeline

try:
    from mmdet.apis import inference_detector, init_detector
    has_mmdet = True
except (ImportError, ModuleNotFoundError):
    has_mmdet = False

HOME = os.path.dirname(os.path.realpath(__file__))

model_cfg = {
    "det_config": os.path.join(HOME, 'config/rtm_det_m.py'),
    "det_checkpoint": os.path.join(HOME, 'model/rtm_det_m.pth'),
    "pose_config": os.path.join(HOME, 'config/rtm_pose_x.py'),
    "pose_checkpoint": os.path.join(HOME, 'model/rtm_pose_x.pth')
}

def parse_args():
    parser = argparse.ArgumentParser(
        description='RTMPose Python API'
    )
    parser.add_argument('input_video')
    parser.add_argument('output_path')
    

    args = parser.parse_args()

    return args


def main():
    args = parse_args()
    rtmpose(args.input_video, args.output_path)

def process_one_image(img,
                      detector,
                      pose_estimator,
                      visualizer=None,
                      show_interval=0):
    
    det_result = inference_detector(detector, img)
    pred_instance = det_result.pred_instances.cpu().numpy()

    bboxes = np.concatenate(
        (pred_instance.bboxes, pred_instance.scores[:, None]), axis=1)
    
    bboxes = bboxes[np.logical_and(pred_instance.labels == 0,
                                      pred_instance.scores > 0.3)] # bbox_thr = 0.65
    bboxes = bboxes[nms(bboxes, 0.3), :4] # nms_thr = 0.3

    pose_results=inference_topdown(pose_estimator, img, bboxes)
    data_samples = merge_data_samples(pose_results)

    if isinstance(img, str):
        img = mmcv.imread(img, channel_order='rgb')
    elif isinstance(img, np.ndarray):
        img = mmcv.bgr2rgb(img)

    if visualizer is not None:
        visualizer.add_datasample(
            'result',
            img,
            data_sample=data_samples,
            draw_gt=False,
            draw_heatmap=False,
            draw_bbox=False,
            show_kpt_idx=False,
            skeleton_style="coco",
            show=False,
            wait_time=show_interval,
            kpt_thr=0.3) # kpt_thr = 0.15
        
    return data_samples.get('pred_instances', None)

def rtmpose(i_path, o_path, device_, f_idx=0):
    assert has_mmdet, 'Please install mmdet to run this code'

    VIDEOS = os.path.join(o_path, 'rtm_videos')
    KEYPOINTS = os.path.join(o_path, 'keypoints')

    mmengine.mkdir_or_exist(o_path)
    mmengine.mkdir_or_exist(VIDEOS)
    mmengine.mkdir_or_exist(KEYPOINTS)

    filename, _ = os.path.splitext(os.path.basename(i_path))

    video_name = os.path.join(VIDEOS, filename + '.mp4')
    keypoints_name = os.path.join(KEYPOINTS, filename + '.json')
    
    detector = init_detector(
        model_cfg['det_config'], model_cfg['det_checkpoint'], device=device_
    )
    detector.cfg = adapt_mmdet_pipeline(detector.cfg)

    pose_estimator = init_pose_estimator(
        model_cfg['pose_config'],
        model_cfg['pose_checkpoint'],
        device=device_,
        cfg_options=dict(
            model=dict(test_cfg=dict(output_heatmaps=False))
        )
    )
    pose_estimator.cfg.visualizer.radius = 3
    pose_estimator.cfg.visualizer.alpha = 0.8
    pose_estimator.cfg.visualizer.line_width = 3

    visualizer = VISUALIZERS.build(pose_estimator.cfg.visualizer)
    visualizer.set_dataset_meta(
        pose_estimator.dataset_meta, skeleton_style='coco'
    )

    cap = cv2.VideoCapture(i_path)

    video_writer = None
    pred_instances_list = []

    pbar = tqdm(position=0, leave=False)

    while cap.isOpened():
        success, frame = cap.read()
        f_idx += 1
        
        if not success:
            break

        pred_instances = process_one_image(frame, detector, pose_estimator, visualizer)

        pred_instances_list.append(
            dict(
                frame_idx=f_idx,
                instances=split_instances(pred_instances)
            )
        )

        # Save Video
        if video_name:
            frame_vis = visualizer.get_image()

            if video_writer is None:
                fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                video_writer = cv2.VideoWriter(
                    video_name, fourcc, 60, (frame_vis.shape[1], frame_vis.shape[0]) # fps: 60
                )

            video_writer.write(mmcv.rgb2bgr(frame_vis))
        
        pbar.update(1)

    if video_writer:
            video_writer.release()

    cap.release()

    with open(keypoints_name, 'w') as f:
        json.dump(
            dict(
                meta_info=pose_estimator.dataset_meta,
                instance_info=pred_instances_list
            ),
            f,
            indent='\t'
        )

    return keypoints_name
    
if __name__ == '__main__':
    main()