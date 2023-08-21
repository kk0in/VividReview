import os
import csv
import json
import argparse

RTMPOSE_PREFIX = ""

def time_to_frame(time_str, frame_rate=60):
    minutes, seconds, frames = map(int, time_str.split(':'))
    return minutes * 60 * frame_rate + seconds * frame_rate + frames

def trim_json(json_data, start_time, end_time, frame_rate):
    start_frame, end_frame = time_to_frame(start_time, frame_rate), time_to_frame(end_time, frame_rate)
    
    trimmed_data = []
    for info in json_data["instance_info"]:
        if start_frame <= info["frame_idx"] <= end_frame:
            new_info = {
                "frame_idx": info["frame_idx"],
                "instances": []
            }
            for instance in info["instances"]:
                new_instance = {
                    "keypoints": instance["keypoints"]
                }
                new_info["instances"].append(new_instance)
            trimmed_data.append(new_info)
    return trimmed_data


def validate_trimmed_data(trimmed_data, start_time, end_time, frame_rate):
    start_frame, end_frame = time_to_frame(start_time, frame_rate), time_to_frame(end_time, frame_rate)
    for info in trimmed_data:
        if not start_frame <= info["frame_idx"] <= end_frame:
            return False
    return True

def main(input_path, output_dir, frame_rate):
    # Handle directory or single file input
    files = [input_path] if os.path.isfile(input_path) else [os.path.join(input_path, f) for f in os.listdir(input_path) if f.endswith('.json')]
    
    for file in files:
        # Extract basename and handle "rtmpose_" prefix
        basename = os.path.basename(file).split('.')[0]
        csv_filename = basename.replace(RTMPOSE_PREFIX, "") + '.csv'
        csv_file_path = os.path.join(os.path.dirname(file), csv_filename)

        result_dir = os.path.join(output_dir, f'result_{basename.replace(RTMPOSE_PREFIX, "")}')
        os.makedirs(result_dir, exist_ok=True)

        trimmed_files_count = 0
        try:
            # Load JSON data
            with open(file, 'r') as json_file:
                json_data = json.load(json_file)
            
            with open(csv_file_path, mode='r', encoding='utf-8-sig', errors='ignore') as csv_file:
                csv_reader = csv.DictReader(csv_file)
                csv_rows = list(csv_reader)
                
                for idx, row in enumerate(csv_rows):
                    trimmed_data = trim_json(json_data, row['In'], row['Out'], frame_rate)
                    clean_basename = basename.replace(RTMPOSE_PREFIX, "")
                    output_filename = f"{clean_basename}_{idx}_{row['Modapts']}.json"
                    
                    if not validate_trimmed_data(trimmed_data, row['In'], row['Out'], frame_rate):
                        raise ValueError(f"Validation failed for {output_filename}")
                    
                    with open(os.path.join(result_dir, output_filename), 'w') as outfile:
                        json.dump({"instance_info": trimmed_data}, outfile, indent=4)
                    
                    trimmed_files_count += 1
                    print(f"Trimmed JSON saved as {output_filename}")

                if trimmed_files_count != len(csv_rows):
                    raise ValueError(f"Number of modapts in CSV ({len(csv_rows)}) does not match the number of trimmed JSON files ({trimmed_files_count}).")
        except Exception as e:
            print(f"Error processing {basename}. Reason: {str(e)}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Trim JSON files based on modapts intervals from a CSV.")
    parser.add_argument("input_path", help="Path to the input JSON file or directory containing JSON files.")
    parser.add_argument("output_dir", nargs="?", default=None, help="Directory path to save the output trimmed JSON files.")
    parser.add_argument("--frame_rate", type=int, default=60, help="Frame rate of the videos. Default is 60.")
    
    args = parser.parse_args()
    
    # If the output_dir is not provided, set it to a sub-directory in the input_path
    if args.output_dir is None:
        args.output_dir = os.path.join(args.input_path)
    
    main(args.input_path, args.output_dir, args.frame_rate)



'''
json_trim.py Script Guide
=========================

Description:
------------
This script trims a JSON file based on modapts intervals from an associated CSV file. The trimmed output will only contain the "instance_info" sections of the relevant frames.

Prerequisites:
--------------
1. Ensure Python is installed on your system.
2. Place the `json_trim.py` script in your desired directory.
3. The CSV file should be named similar to its paired JSON file. For instance, if you have `0714_MX_0001.json`, its paired CSV should be named `0714_MX_0001.csv`.

Usage:
------
Command format:
    python json_trim.py <input_path> <output_dir> [--frame_rate <frame_rate_value>]

Arguments:
- <input_path>: Path to the input JSON file or a directory containing JSON files. If a directory is provided, all JSON files within will be processed.
- <output_dir>: Directory path where the output trimmed JSON files will be saved.
- [--frame_rate]: (Optional) Frame rate of the videos. Default value is 60.

Example Commands:
-----------------
1. To trim a single JSON file named `0714_MX_0001.json` and save the output in the `trimmed_files` directory:
    python json_trim.py /path/to/0714_MX_0001.json /path/to/trimmed_files

2. To trim all JSON files in the `json_files` directory and save the output in the `trimmed_files` directory with a frame rate of 30:
    python json_trim.py /path/to/json_files/ /path/to/trimmed_files --frame_rate 30

Note:
-----
The CSV file should be in the same directory as its paired JSON file and should have columns named `Modapts`, `In`, and `Out`. The time format used in these columns is `m:ss:frame`.

'''