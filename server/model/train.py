import argparse
import torch
import numpy as np
from .data_loader import data_loaders as module_data
from .model import loss as module_loss
from .model import metric as module_metric
from .model import model as module_arch

from .parse_config import ConfigParser
import joblib
from datetime import datetime
import os
from .trainer import Trainer
from .utils import prepare_device


# fix random seeds for reproducibility
SEED = 123
torch.manual_seed(SEED)
torch.backends.cudnn.deterministic = True
torch.backends.cudnn.benchmark = False
np.random.seed(SEED)

def train_model(config):

    # setup data_loader instances
    data_loader = config.init_obj('data_loader', module_data)
    train_loader = data_loader.train_loader
    val_loader = data_loader.val_loader
    test_loader = data_loader.test_loader
    scaler = data_loader.scaler
    
    scaler_dir = config['scaler_dir']
    os.makedirs(scaler_dir, exist_ok=True)
    scalers_count = len(os.listdir(scaler_dir))
    timestamp = datetime.now().strftime("%Y-%m-%d-%H-%M")
    scaler_path = os.path.join(scaler_dir, f"scaler_{scalers_count}_{timestamp}.joblib")
    joblib.dump(scaler, scaler_path)

    # build model architecture, then print to console
    model = config.init_obj('arch', module_arch)

    # prepare for (multi-device) GPU training
    device, device_ids = prepare_device(config['n_gpu'])
    model = model.to(device)
    if len(device_ids) > 1:
        model = torch.nn.DataParallel(model, device_ids=device_ids)

    # get function handles of loss and metrics
    criterion = getattr(module_loss, config['loss'])

    # build optimizer, learning rate scheduler. delete every lines containing lr_scheduler for disabling scheduler
    trainable_params = filter(lambda p: p.requires_grad, model.parameters())
    optimizer = config.init_obj('optimizer', torch.optim, trainable_params)
    lr_scheduler = config.init_obj('lr_scheduler', torch.optim.lr_scheduler, optimizer)
    
    checkpoint_dir = config['checkpoint_dir']
    os.makedirs(checkpoint_dir, exist_ok=True)
    model_count = len(os.listdir(checkpoint_dir))
    timestamp = datetime.now().strftime("%Y-%m-%d-%H-%M")
    model_path = os.path.join(checkpoint_dir, f"model_{model_count}_{timestamp}.pth")

    trainer = Trainer(model, criterion, optimizer,
                      config=config,
                      device=device,
                      train_loader=train_loader,
                      val_loader=val_loader,
                      test_loader=test_loader,
                      lr_scheduler=lr_scheduler,
                      model_path=model_path)

    trainer.train()
    return scaler_path, model_path


if __name__ == '__main__':
    args = argparse.ArgumentParser(description='PyTorch Template')
    args.add_argument('-c', '--config', default=None, type=str,
                      help='config file path (default: None)')
    args.add_argument('-r', '--resume', default=None, type=str,
                      help='path to latest checkpoint (default: None)')
    args.add_argument('-d', '--device', default=None, type=str,
                      help='indices of GPUs to enable (default: all)')

    config = ConfigParser.from_args(args, "")
    train_model(config)
