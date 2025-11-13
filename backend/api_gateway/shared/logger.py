import logging
import os

class ColoredFormatter(logging.Formatter):
    """Custom formatter that adds colors to log levels"""
    
    # ANSI color codes
    COLORS = {
        logging.DEBUG: '\033[36m', # Cyan
        logging.INFO: '\033[32m', # Green
        logging.WARNING: '\033[33m',# Yellow
        logging.ERROR: '\033[31m',# Red
    }
    RESET = '\033[0m'
    
    def format(self, record):
        log_color = self.COLORS.get(record.levelno, self.RESET)
        record.levelname = f"{log_color}{record.levelname}{self.RESET}"
        return super().format(record)


class Logger:
    def __init__(self, service_name, log_file="app.log", level=logging.INFO):

        os.makedirs("logs", exist_ok=True)
        log_path = os.path.join("logs", log_file)

        # Create or get logger for this service
        self.logger = logging.getLogger(service_name)
        self.logger.setLevel(level)

        # Prevent duplicate handlers
        if not self.logger.handlers:
            # Console handler with colors
            console_handler = logging.StreamHandler()
            colored_formatter = ColoredFormatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            )
            console_handler.setFormatter(colored_formatter)
            self.logger.addHandler(console_handler)

            # File handler without colors
            file_handler = logging.FileHandler(log_path)
            file_formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            )
            file_handler.setFormatter(file_formatter)
            self.logger.addHandler(file_handler)

    # Logging methods
    def info(self, message):
        self.logger.info(message)

    def debug(self, message):
        self.logger.debug(message)

    def error(self, message):
        self.logger.error(message)
    
    def warning(self, message):
        self.logger.warning(message)
    