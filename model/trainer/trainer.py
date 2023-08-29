import numpy as np
import torch
from torchvision.utils import make_grid
from utils import inf_loop, MetricTracker
import wandb
import time
from datetime import datetime
import os
import matplotlib.pyplot as plt
from sklearn.metrics import *
from collections import defaultdict, Counter


class Trainer():
    """
    Trainer class
    """
    def __init__(self, model, criterion, optimizer, config, device,
                 train_loader, val_loader=None, test_loader=None, lr_scheduler=None, tta=False):
        self.model = model
        self.optimizer = optimizer
        self.config = config['trainer']
        self.window_size = config['data_loader']['args']['window']
        self.wandb_config = config['wandb']
        self.device = device
        self.criterion = criterion
        self.train_loader = train_loader
        self.val_loader = val_loader
        self.test_loader = test_loader
        self.lr_scheduler = lr_scheduler
        self.tta = tta
        self.num_classes = config['arch']['args']['output_size']
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        os.makedirs("checkpoints", exist_ok=True)
        self.model_save_path = f"checkpoints/model_{timestamp}.pth"
        
        
    def train(self):
        sweep_id = self.wandb_config['sweep_id']
        if sweep_id:
            wandb.agent(sweep_id, function=self._train, project="sec-lstm", entity="snu-hci")
        else:
            self._train()
    
    def _train(self):
        wandb.init(config=self.config, project=self.wandb_config['project'], entity=self.wandb_config['entity'])
        net = self.model
        net.to(self.device)

        optimizer = self.optimizer
        scheduler = self.lr_scheduler
        criterion = self.criterion
        
        train_loader = self.train_loader
        val_loader = self.val_loader
        test_loader = self.test_loader

        best_accuracy = 0
        test_accuracy = 0
        print("Train Start")
        for epoch in range(wandb.config.epochs):
            start_time = time.time()
            net.train()  # Set the model to training mode
            train_loss = 0
            total_batches = len(train_loader)
            for batch_idx, batch in enumerate(train_loader):
                inputs, labels = batch
                inputs = inputs.to(self.device)
                labels = labels.to(self.device)
                optimizer.zero_grad()  # Zero the gradients
                outputs = net(inputs)  # Forward pass
                loss = criterion(outputs, labels)  # Calculate the cross-entropy loss
                loss.backward()  # Backpropagation
                optimizer.step()  # Update weights
                train_loss += loss.item()
                average_loss = train_loss / (batch_idx+1)
                print(f"\rEpoch [{epoch+1}]: Batch {batch_idx+1}/{total_batches} Train Loss: {average_loss:.4f}", end="")
            print("")
            average_train_loss = train_loss / len(train_loader)
            
            if val_loader:
                net.eval()  # Set the model to evaluation mode
                val_loss = 0
                predictions = []
                targets = []
                with torch.no_grad():
                    for inputs, labels in val_loader:
                        inputs = inputs.to(self.device)
                        labels = labels.to(self.device)
                        outputs = net(inputs)
                        ## flatten tensors for multi target LSTM case
                        loss = criterion(outputs, labels)
                        outputs = outputs.view(-1, net.output_size)
                        labels = labels.view(-1)
                        prediction = torch.argmax(outputs, dim=1)
                        predictions += prediction.tolist()
                        val_loss += loss.item()
                        targets += labels.cpu().tolist()
                average_val_loss = val_loss / len(val_loader)
                val_accuracy = accuracy_score(targets, predictions)
                end_time = time.time() - start_time
                print(f"Epoch [{epoch+1}]: Val Loss: {average_val_loss:.4f}, Val Accuracy: {val_accuracy:.4f}, time: {end_time:.2f} s")
                
                if val_accuracy > best_accuracy:
                    best_accuracy = val_accuracy
                    torch.save(net.state_dict(), self.model_save_path) #Save the checkpoint
                    predictions = []
                    targets = []
                    with torch.no_grad():
                        for inputs, labels in test_loader:
                            inputs = inputs.to(self.device)
                            labels = labels.to(self.device)
                            outputs = net(inputs)
                            loss = criterion(outputs, labels)
                            ## flatten tensors for multi target LSTM case
                            outputs = outputs.view(-1, net.output_size)
                            labels = labels.view(-1)
                            prediction = torch.argmax(outputs, dim=1)
                            predictions += prediction.tolist()
                            val_loss += loss.item()
                            targets += labels.cpu().tolist()
                    test_accuracy = accuracy_score(targets, predictions)
                    if self.window_size == 180:
                        overlap_test = overlap_accuracy(targets, predictions, self.window_size, 10)
                        print(f"Overlap Accuracy: {overlap_test:.4f}")
                    f1 = f1_score(targets, predictions, average='macro')
                    precision = precision_score(targets, predictions, average='macro')
                    print(f"Test Accuracy: {test_accuracy:.4f}, F1-score: {f1:.4f}, precision: {precision:.4f}")
                    self.plot_and_save_information(targets, predictions)
                wandb.log({
                    "epoch": epoch,
                    "train_loss": average_train_loss,
                    "val_loss": average_val_loss,
                    "val_acc": val_accuracy,
                    "test_acc": test_accuracy
                })
                
                scheduler.step()  # Update the learning rate
            

    def plot_and_save_information(self, targets, predictions, folder='confusion_matrix/'):
        os.makedirs(folder, exist_ok=True)
        
        test_accuracy = accuracy_score(targets, predictions)
        f1 = f1_score(targets, predictions, average='macro')
        precision = precision_score(targets, predictions, average='macro')
        
        with open(folder+"metrics.txt", "w") as f:
            f.write(f"Accuracy: {test_accuracy}\n")
            f.write(f"F1 score(macro): {f1}\n")
            f.write(f"Precision(macro): {precision}\n")
        
        cm = confusion_matrix(targets, predictions, labels=range(self.num_classes))
        classes = ["M3", "G1", "M1", "M2", "P2", "R2", "A2", "BG"][:self.num_classes]
        cm_percent = cm.astype('float') / len(predictions) * 100
        disp = ConfusionMatrixDisplay(confusion_matrix=cm_percent, display_labels=classes)
        disp.plot(cmap=plt.cm.Blues, values_format=".2f")
        plt.savefig(folder+"percent_conf_mat.png")
        plt.close()
        
        cm = confusion_matrix(targets, predictions, normalize='true', labels=range(self.num_classes))
        disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=classes)
        disp.plot(cmap=plt.cm.Blues, values_format=".2f")
        plt.savefig(folder+"normal_conf_mat.png")
        plt.close()


def overlap_accuracy(labels, predictions, window_size, interval):
    merged_predictions = defaultdict(list)
    merged_labels = defaultdict(list)
    
    assert len(labels) % window_size == 0
    length = len(labels)//window_size 
    
    for i in range(length):
        start = i*window_size
        global_start = i*interval
        
        for j in range(window_size):
            merged_predictions[global_start+j].append(predictions[start+j])
            merged_labels[global_start+j].append(labels[start+j])
    
    score = 0
    total = 0
    for idx in merged_predictions.keys():
        _labels = merged_labels[idx]
        _predictions = merged_predictions[idx]
        assert all(l == _labels[0] for l in _labels), f"{_labels}"
        counter = Counter(_predictions)
        most_common = counter.most_common(1)[0][0]
        if _labels[0] == most_common:
            score += 1
        total += 1
    return score / total
            
            
        
        