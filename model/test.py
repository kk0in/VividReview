import argparse
import torch
from tqdm import tqdm
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from .preprocess import run_pipe
import joblib
import json
from .model.model import SimpleNet
from torch.utils.data import Dataset, DataLoader
import torch.nn.functional as F
import os
from typing import Dict
import shutil


LABELS = ['M3', 'G1', 'M1', 'M2', 'P2', 'R2', 'A2', 'BG']

# overlap rows to move the window (ex: 1 2 3 4 5 6 ->  1 2 3 4  2 3 4 5  3 4 5 6 ...)
def overlap_rows(arr, window_size):
    overlapped_rows = []

    for i in range(len(arr) - window_size + 1):
        window = arr[i:i + window_size]
        overlapped_rows.extend(window)

    overlapped_rows = np.array(overlapped_rows)
    print(f"{arr.shape} overlapped: {overlapped_rows.shape}")

    return overlapped_rows

# Load the inference inputs
def load_inf(path, window):
    file = open(path, 'r')
    X_ = np.array(
        [elem for elem in [
            row.split(',') for row in file
        ]], 
        dtype=np.float32
    )
    file.close()
    X_ = overlap_rows(X_, window)
    blocks = int(len(X_) / window)
    
    X_ = np.array(np.split(X_,blocks))

    return X_ 


def scale_input(input_array, scaler_path, window):
    scaler = joblib.load(scaler_path)
    sample_count = len(input_array)
    flattened = input_array.reshape((sample_count, -1))
    scaled_input = scaler.transform(flattened)
    return scaled_input.reshape((sample_count, window, -1))


def unpack_output(output):
    softmax_output = torch.softmax(output, dim=1)
    confidence_scores = softmax_output.max(dim=1)[0]  # Taking the maximum value from softmax as confidence
    
    top_n, top_i = output.topk(1, dim=1)  # Specify dim=1 for batch dimension
    category_i = top_i.squeeze()  # Remove the singleton dimension
    
    labels = LABELS[category_i.item()]
    confidence_scores = confidence_scores.item()
    
    #print(labels, confidence_scores, category_i.item())

    return labels, confidence_scores, category_i.item()


# transform output to collect y output for each frame (ex: 1 2 3 4 5 6 -> [_ _ _ 1] [_ _ 1 2] [_ 1 2 3] [1 2 3 4] [2 3 4 5] [3 4 5 6])
def transform_output(arr, window_size, default_value=-1):
    transformed_rows = []
    
    for i in range(-window_size+1, len(arr - 1)):
        window = [arr[j] if 0 <= j < len(arr) else default_value for j in range(i, i + window_size)]
        transformed_rows.append(window)
    
    return np.array(transformed_rows, dtype=arr.dtype)



# Convert frame count(int) to timestamp(str, HH:MM:SS.FF)
def frame_to_timestamp(frame_count, fps):
    second_stamp = int(frame_count / fps)
    frame_stamp = frame_count % fps
    return (datetime.min + timedelta(seconds=second_stamp)).time().strftime('%M:%S') + ':' + str(frame_stamp).zfill(2)

def confidence_to_label(confidence_scores):
    # Convert confidence scores to labels
    labels = []
    for confidence_score in confidence_scores:
        #print(confidence_score)
        label = confidence_score.argmax()
        labels.append(label)
    return labels

# Convert confidence scores to timestamps and save them as a CSV file
# confidence_scores_array: (frame_count, n_steps, len(LABELS))
def convert_timestamp_csv(label_array, output_csv_path):

    # Merge consecutive labels and create timestamps
    timestamps = []
    current_label = None
    start_time = "00:00:00"
    start_frame = -1
    end_time = "00:00:00"

    for frame, label in enumerate(label_array):
        if label != current_label:
            if current_label is not None:
                duration = frame_to_timestamp(frame - start_frame, 60)
                end_time = frame_to_timestamp(frame, 60)
                timestamps.append((LABELS[current_label], start_time, end_time, duration))
            
            current_label = label
            start_time = end_time
            start_frame = frame

    # Append the last timestamp
    if current_label is not None:
        duration = frame_to_timestamp(frame - start_frame, 60)
        end_time = frame_to_timestamp(frame, 60)
        #print(start_time, end_time, current_label)
        timestamps.append((LABELS[current_label], start_time, end_time, duration))

    # Create a DataFrame
    df = pd.DataFrame(timestamps, columns=['label', 'start', 'end', 'duration'])

    # Save the DataFrame as a CSV file
    df.to_csv(output_csv_path, index=False)

# voting between inferences with different frame ranges, counting only the ones with confidence above a threshold

confidence_threshold = 0.5

def decide_label(label_array, confidence_array):
    final_labels = []
    
    for i in range(label_array.shape[0]):
        frame_labels = label_array[i]
        frame_confidences = np.max(confidence_array[i], axis=1)
        
        # Collect votes for labels above the confidence threshold
        votes = [(label, confidence) for label, confidence in zip(frame_labels, frame_confidences) if confidence >= confidence_threshold and label != -1]
        
        # If there are no votes above the threshold, choose the label with the highest confidence
        if not votes:
            max_confidence_index = np.argmax(frame_confidences)
            final_label = frame_labels[max_confidence_index]
        else:
            # Choose the most frequent vote
            vote_counts = np.bincount([label for label, _ in votes])
            max_vote_count = np.max(vote_counts)
            
            # Check if there are ties in vote counts
            tied_labels = np.where(vote_counts == max_vote_count)[0]
            
            if len(tied_labels) == 1:
                final_label = tied_labels[0]
            else:
                # Choose the tied label with higher total confidence
                total_confidences = [sum(confidence for label_vote, confidence in votes if label_vote == label) for label in tied_labels]
                max_total_confidence_index = np.argmax(total_confidences)
                final_label = tied_labels[max_total_confidence_index]
        
        final_labels.append(final_label)
    
    return np.array(final_labels)

def inference(input_path:str, gt_path:str=None, config:Dict[str, str]={})->str:
    """run inference

    :param input_path: input feature file path
    :type input_path: str
    :param gt_path: ground truth path, defaults to None
    :type gt_path: str, optional
    :param config: config dictionary, defaults to {}
    :type config: _type_, optional
    :return: result folder
    :rtype: str
    """
    
    print(f"Inference on {input_path}, ground truth: {gt_path}")
    
    device = torch.device(config['device'])
    input_file_name, _ = os.path.splitext(os.path.basename(input_path))
    output_folder = os.path.dirname(os.path.realpath(__file__)) + f"/results/{input_file_name}/"
    os.makedirs(output_folder, exist_ok=True)
    inference_output_path = output_folder + f"test_inf_labels_{input_file_name}.txt"
    inference_confidence_path = output_folder + f"test_inf_confidence_{input_file_name}.txt"
    inference_csv_path = output_folder + f"{input_file_name}.csv"
    gt_avail = True if gt_path else False
    
    scaler_path = config['scaler_path']
    window = config['window']

    inf_input = load_inf(input_path, window)
    inf_input = scale_input(inf_input, scaler_path, window) # scale inputs

    predictions = []   # top label
    softmax_results = []   # confidence scores
    
    feature_size = inf_input.shape[2]
    model_config = config['model']
    net = SimpleNet(feature_size, 8, model_config['linear_layers'], model_config['lstm_hidden'], model_config['dropout_prob'])
    net.load_state_dict(torch.load(config['checkpoint_path']))
    net.eval() 
    net.to(device)

    # Create a DataLoader
    test_loader = DataLoader(inf_input, batch_size=4096, shuffle=False)
    feature_size = inf_input.shape[2]

    with torch.no_grad():
        for inputs in test_loader:
            inputs = inputs.to(device)
            outputs = net(inputs)
            batch_softmax = F.softmax(outputs, dim=1)
            softmax_results.append(batch_softmax)
            prediction = torch.argmax(outputs, dim=1) 
            predictions += prediction.tolist()
        

    softmax_results = torch.cat(softmax_results, dim=0)
    softmax_results = np.array(softmax_results.detach().cpu().tolist(), dtype=np.float32) 

    indices_array = np.array(predictions, dtype=np.int32)
    reorganized_indices = transform_output(indices_array, window)
    np.savetxt(inference_output_path, reorganized_indices, fmt='%d', delimiter=' ')

    reorganized_confidence = transform_output(softmax_results, window, np.full(softmax_results[0].shape, 0))
    np.savetxt(inference_confidence_path, reorganized_confidence.reshape(-1, reorganized_confidence.shape[-1]), fmt='%.3f', delimiter=' ')

    final_labels = decide_label(reorganized_indices, reorganized_confidence)

    convert_timestamp_csv(final_labels, inference_csv_path)

    if (gt_avail):
        ground_truth = []
        with open(gt_path, "r") as f:
            lines = f.readlines()
            lines = [l.replace("\n", "") for l in lines]
            for line in lines:
                ground_truth.append(int(line))

        #print(f"len(ground_truth): {len(ground_truth)}, len(final_labels): {len(final_labels)}")
        assert len(final_labels) == len(ground_truth)

        total_correct = np.sum(final_labels == ground_truth)

        accuracy = total_correct / len(test_loader.dataset)
        print("Accuracy: ", accuracy)
    
    abs_output_folder = os.path.abspath(output_folder)
    return abs_output_folder


def run_inference(input_video:str, gt_path:str=None, config_path:str=None)->str:
    """_summary_

    :param input_video: video_path
    :type input_video: str
    :param gt_path: ground truth csv path, defaults to None
    :type gt_path: str, optional
    :param config_path: path to config json file, defaults to None
    :type config_path: str, optional
    :return: directory where the results are stored
    :rtype: str
    """
    
    if config_path is None:
        config_path = os.path.dirname(os.path.realpath(__file__))+"/config/test.json"
    
    with open(config_path, 'r') as json_file:
        json_data = json_file.read()
    config = json.loads(json_data)
    
    frame_rate = config['frame_rate']
    window = config['window']
    
    json_path, csv_path = run_pipe(input_video, frame_rate, window, inference=True)
    result_folder = inference(csv_path, gt_path, config)
    shutil.copy(json_path, result_folder)
    return result_folder
    
    

if __name__ == '__main__':
    args = argparse.ArgumentParser(description='PyTorch Template')
    args.add_argument('-c', '--config', default="test_config.json", type=str,
                      help='config path')
    args.add_argument('-v', '--video', required=True, type=str,
                      help='video path')
    args.add_argument('-g', '--ground_truth', default=None, type=str,
                      help='ground truth path')
    

    run_inference(args.video, args.ground_truth, args.config)


