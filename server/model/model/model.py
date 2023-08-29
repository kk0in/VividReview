import torch.nn as nn
import torch.nn.functional as F
import torch


class SimpleNet(nn.Module):
    def __init__(self, input_size=138, output_size=8, linear_layers=0, lstm_hidden=256, dropout_prob=0.3):
        super(SimpleNet, self).__init__()
        
        self.lstm_layers = 1
        self.lstm_hidden = lstm_hidden
        self.lstm_input = 1024
        self.input_size = input_size
        self.output_size = output_size

        pre_layers = [
            [input_size, 2048],
            [2048, 1024],
        ] + [
            [1024, 1024] for _ in range(linear_layers)
        ] + [
            [1024, self.lstm_input]
        ]

        self.pre = nn.ModuleList([
            nn.Sequential(
                nn.Linear(i, o),
                nn.BatchNorm1d(o),
                nn.GELU(),
                nn.Dropout(p=dropout_prob)
            )
            for i, o in pre_layers
        ])

        self.lstm = nn.LSTM(self.lstm_input, self.lstm_hidden, num_layers=self.lstm_layers, batch_first=True)

        self.last = nn.Sequential(
            nn.Linear(self.lstm_hidden, 256),
            nn.BatchNorm1d(256),
            nn.GELU(),
            nn.Dropout(p=dropout_prob),
            nn.Linear(256, output_size)
        )

    
    def forward(self, x):
        batch_size = x.shape[0]
        x = x.view(-1, self.input_size)
        for layer in self.pre:
            x = layer(x)
        x = x.view(batch_size, -1, self.lstm_input)
        x, _ = self.lstm(x)
        x = self.last(x[:, -1, :].squeeze(1)) 
        return x 
    
    
class KeypointNet(nn.Module):
    def __init__(self, input_size=96, output_size=8, lstm_hidden=1024, dropout_prob=0.3):
        super(KeypointNet, self).__init__()
        
        self.lstm_layers = 1
        self.lstm_hidden = lstm_hidden
        self.lstm_input = 1024
        self.input_size = input_size
        self.output_size = output_size
        
        self.pre = nn.Sequential(
            nn.Linear(input_size, self.lstm_input),
            nn.BatchNorm1d(self.lstm_input),
            nn.GELU()
        )
        self.lstm_random = nn.LSTM(self.lstm_input, self.lstm_hidden, num_layers=self.lstm_layers, batch_first=True)
        # self.lstm_long = nn.LSTM(self.lstm_input, self.lstm_hidden, num_layers=self.lstm_layers, batch_first=True)
        # self.lstm_short = nn.LSTM(self.lstm_input, self.lstm_hidden, num_layers=self.lstm_layers, batch_first=True)
        
        layers = [
            [self.lstm_hidden, 1024],
            [1024, 512],
            [512, 256],
            [256, 128]
        ]
        self.layers = nn.ModuleList([
            nn.Sequential(
                nn.Linear(i, o),
                nn.BatchNorm1d(o),
                nn.GELU(),
                nn.Dropout(p=dropout_prob)
            )
            for i, o in layers
        ])
        
        self.last = nn.Sequential(
            nn.Linear(128, output_size)
        )

    
    def forward(self, x):
        batch_size = x.shape[0]
        x = x.view(-1, self.input_size)
        x = self.pre(x)
        x = x.view(batch_size, -1, self.lstm_input)
        random_indices = torch.randint(0, 8, (4,))
        lstm_out, _ = self.lstm_random(x[:, random_indices])
        # lstm_short_out, _ = self.lstm_short(x[[0, 1, 2, 3]])
        # lstm_long_out, _ = self.lstm_long(x[[0, 2, 4, 6]])
        out = lstm_out[:, -1, :].squeeze(1)
        for layer in self.layers:
            out = layer(out)
        out = self.last(out)
        return out 
    
class LargeNet(nn.Module):
    def __init__(self, input_size=138, output_size=8, lstm_hidden=1024, projection_size=128, lstm_layers=2, dropout_prob=0.3):
        super(LargeNet, self).__init__()
        
        self.lstm_layers = lstm_layers
        self.lstm_hidden = lstm_hidden
        self.lstm_input = 256
        self.input_size = input_size
        self.projection_size = projection_size
        self.output_size = output_size
        
        self.pre = nn.Sequential(
            nn.Linear(self.input_size, self.lstm_input),
            nn.BatchNorm1d(self.lstm_input),
            nn.GELU()
        )
        
        self.lstm = nn.LSTM(self.lstm_input, self.lstm_hidden, proj_size=self.projection_size, num_layers=self.lstm_layers, batch_first=True, bidirectional=True)

        self.last = nn.Sequential(
            nn.Linear(self.projection_size*2, 256),
            nn.BatchNorm1d(256),
            nn.GELU(),
            nn.Dropout(p=dropout_prob),
            nn.Linear(256, output_size)
        )

    
    def forward(self, x):
        batch_size = x.shape[0]
        x = x.view(-1, self.input_size)
        x = self.pre(x)
        x = x.view(batch_size, -1, self.lstm_input)
        lstm_out, _ = self.lstm(x)
        out = lstm_out.contiguous().view(-1, self.projection_size*2)
        out = self.last(out)
        out = out.view(batch_size, -1, self.output_size)
        return out 