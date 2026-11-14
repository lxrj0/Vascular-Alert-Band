# Smart Vascular Alert Band

**Smart Monitoring for Early Detection of Acute Compartment Syndrome (ACS)**

🔗 **Live Demo:** [Open dashboard](https://lovable.dev/preview/4jBZAMtXRjK2Xvl3Kq9cPHMeBX9JjJyO)

> ⚠️ **Disclaimer:** This is a prototype for educational purposes only. It is not a certified medical device and must not be used for clinical decisions.

## Overview

Smart Vascular Alert is a healthcare technology prototype designed to support early risk identification of Acute Compartment Syndrome (ACS) in patients with tibial shaft fractures.

The system monitors selected physiological indicators, analyzes changes, and provides visual risk classification and alerts.

## The Problem

Acute Compartment Syndrome is a serious orthopedic emergency. Delayed recognition can lead to severe complications, including permanent tissue damage.

## Our Solution

A smart sleeve concept that combines sensor-based data collection, risk assessment, and a visual dashboard to support clinical awareness.

## Monitored Parameters

- **Oxygen Saturation (SpO₂)**
- **Perfusion**
- **Temperature**

## Features

- Real-time risk status for each parameter (Normal / Warning / High risk)
- Overall patient risk indicator
- Visual alerts when thresholds are crossed
- Clean dashboard designed for quick reading

## How It Works

Each parameter is compared against defined thresholds, and the results are combined into an overall risk classification.

### Temperature

Baseline: **37.5°C**. Only a **rise** above the baseline is counted.

| Rise above baseline | Risk level |
|---|---|
| ≤ 0.5°C | Normal |
| ≤ 1.5°C | Warning |
| > 1.5°C | High risk |

### Perfusion

Based on Perfusion Index (PI). Lower values indicate reduced blood flow.

| Perfusion | Risk level |
|---|---|
| (add thresholds from the code) | Normal |
| (add thresholds from the code) | Warning |
| (add thresholds from the code) | High risk |

### SpO₂

| SpO₂ | Risk level |
|---|---|
| (add thresholds from the code) | Normal |
| (add thresholds from the code) | Warning |
| (add thresholds from the code) | High risk |

## Screenshots

_Add dashboard screenshots here (Normal, Warning, High risk)._

## Future Work

- Integration with real sensors (e.g., pulse oximetry and temperature sensors)
- Mobile notifications for clinicians
- Trend analysis over time
- Clinical validation

## Tech Stack

- Built with [Lovable](https://lovable.dev)
- React + TypeScript
- Hosted via Lovable, synced with GitHub

## Development

```bash
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Team

**Methodon**
