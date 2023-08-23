import numpy as np
import torch
from torchvision.utils import make_grid
from utils import inf_loop, MetricTracker
import wandb
import time
from datetime import datetime
import os


class Trainer():
    """
    Trainer class
    """
    def __init__(self, model, criterion, optimizer, config, device,
                 train_loader, val_loader=None, test_loader=None, lr_scheduler=None):
        self.model = model
        self.optimizer = optimizer
        self.config = config['trainer']
        self.wandb_config = config['wandb']
        self.device = device
        self.criterion = criterion
        self.train_loader = train_loader
        self.val_loader = val_loader
        self.test_loader = test_loader
        self.lr_scheduler = lr_scheduler
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
                total_correct = 0
                with torch.no_grad():
                    for inputs, labels in val_loader:
                        inputs = inputs.to(self.device)
                        labels = labels.to(self.device)
                        outputs = net(inputs)
                        predictions = torch.argmax(outputs, dim=1)
                        loss = criterion(outputs, labels)
                        val_loss += loss.item()
                        total_correct += (predictions == labels).sum().item()
                average_val_loss = val_loss / len(val_loader)
                accuracy = total_correct / len(val_loader.dataset)
                end_time = time.time() - start_time
                print(f"Epoch [{epoch+1}]: Val Loss: {average_val_loss:.4f}, Val Accuracy: {accuracy:.4f}, time: {end_time:.2f} s")
                
                if accuracy > best_accuracy:
                    best_accuracy = accuracy
                    torch.save(net.state_dict(), self.model_save_path) #Save the checkpoint
                    total_correct = 0
                    with torch.no_grad():
                        for inputs, labels in test_loader:
                            inputs = inputs.to(self.device)
                            labels = labels.to(self.device)
                            outputs = net(inputs)
                            predictions = torch.argmax(outputs, dim=1)
                            loss = criterion(outputs, labels)
                            val_loss += loss.item()
                            total_correct += (predictions == labels).sum().item()
                    test_accuracy = total_correct / len(test_loader.dataset)
                    print(f"Test Accuracy: {test_accuracy:.4f}")
                wandb.log({
                    "epoch": epoch,
                    "train_loss": average_train_loss,
                    "val_loss": average_val_loss,
                    "val_acc": accuracy,
                    "test_acc": test_accuracy
                })
                scheduler.step()  # Update the learning rate
            
