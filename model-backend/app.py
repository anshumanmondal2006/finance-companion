import os
from dotenv import load_dotenv
load_dotenv()
import logging

logging.basicConfig(
    level=logging.INFO,   # or DEBUG for more logs
    format="%(asctime)s - %(levelname)s - %(message)s"
)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
