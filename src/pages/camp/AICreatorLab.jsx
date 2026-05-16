import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AICreatorLab() {
  const navigate = useNavigate()
  const [learningRate, setLearningRate] = useState(0.01)
  const [epochs, setEpochs] = useState(50)
  const [trainingStatus, setTrainingStatus] = useState('idle') // idle, training, complete
  const [currentEpoch, setCurrentEpoch] = useState(0)
  const [lossHistory, setLossHistory] = useState([])
  const [accuracyHistory, setAccuracyHistory] = useState([])
  
  // Testing Phase
  const [selectedTest, setSelectedTest] = useState(null)
  const [prediction, setPrediction] = useState(null)

  const TEST_SAMPLES = [
    { id: 1, name: 'Handwritten "7"', type: 'image', trueLabel: 'Number 7' },
    { id: 2, name: 'Picture of a Cat', type: 'image', trueLabel: 'Animal: Cat' },
    { id: 3, name: 'Audio: "Hello"', type: 'audio', trueLabel: 'Speech: Hello' }
  ]

  // Graph dimensions
  const graphWidth = 400
  const graphHeight = 200

  const startTraining = () => {
    setTrainingStatus('training')
    setCurrentEpoch(0)
    setLossHistory([])
    setAccuracyHistory([])
    setPrediction(null)
    setSelectedTest(null)
  }

  // Training Simulation Loop
  useEffect(() => {
    if (trainingStatus === 'training') {
      if (currentEpoch >= epochs) {
        setTrainingStatus('complete')
        return
      }

      const timer = setTimeout(() => {
        // Simulate Loss decreasing and Accuracy increasing
        // If learning rate is too high, make it unstable
        let newLoss, newAcc
        
        if (learningRate > 0.1) {
          // Unstable learning
          newLoss = Math.max(0.1, 1 - (currentEpoch / epochs) + (Math.random() * 0.5))
          newAcc = Math.min(0.9, (currentEpoch / epochs) + (Math.random() * 0.3) - 0.1)
        } else if (learningRate < 0.001) {
          // Very slow learning
          newLoss = 1 - (currentEpoch / (epochs * 3))
          newAcc = (currentEpoch / (epochs * 3))
        } else {
          // Good learning curve
          newLoss = Math.max(0.05, 1 - Math.pow(currentEpoch / epochs, 0.8) + (Math.random() * 0.05))
          newAcc = Math.min(0.98, Math.pow(currentEpoch / epochs, 1.2) + (Math.random() * 0.05))
        }

        setLossHistory(prev => [...prev, newLoss])
        setAccuracyHistory(prev => [...prev, newAcc])
        setCurrentEpoch(prev => prev + 1)
      }, 50) // 50ms per epoch for fast simulation

      return () => clearTimeout(timer)
    }
  }, [trainingStatus, currentEpoch, epochs, learningRate])

  const runTest = (sample) => {
    setSelectedTest(sample)
    
    // Calculate prediction based on final accuracy
    const finalAcc = accuracyHistory[accuracyHistory.length - 1] || 0
    const isCorrect = Math.random() < finalAcc

    setTimeout(() => {
      if (isCorrect) {
        setPrediction({
          label: sample.trueLabel,
          confidence: (finalAcc * 100).toFixed(1) + '%'
        })
      } else {
        setPrediction({
          label: 'Unknown / Noise',
          confidence: ((1 - finalAcc) * 100).toFixed(1) + '%'
        })
      }
    }, 800) // Simulate processing time
  }

  // Generate SVG path for graphs
  const getPath = (data, color, isLoss) => {
    if (data.length === 0) return ''
    const dx = graphWidth / Math.max(epochs - 1, 1)
    const pts = data.map((val, i) => {
      const x = i * dx
      // val is between 0 and 1.5 roughly. Map to height.
      const y = graphHeight - (Math.min(Math.max(val, 0), 1) * graphHeight)
      return `${x},${y}`
    }).join(' L ')
    return `M ${pts}`
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-300 font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 p-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/camp')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧠</span>
            <div>
              <h1 className="text-white font-bold tracking-tight">AI Creator Lab</h1>
              <div className="flex items-center gap-2 text-xs text-purple-400 font-mono">
                NEURAL_NET_SIMULATOR_V2
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 p-6 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Panel: Hyperparameters */}
        <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit">
          <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            1. Brain Settings
          </h2>
          <p className="text-xs text-purple-300 mb-6 bg-purple-500/10 p-3 rounded-lg border border-purple-500/20">
            <strong>Teacher Tip:</strong> Just like humans, AI needs settings to learn properly. We call these "Hyperparameters".
          </p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-400 mb-2">
                Learning Speed (Learning Rate): <span className="text-white font-bold">{learningRate}</span>
              </label>
              <select 
                value={learningRate} 
                onChange={e => setLearningRate(parseFloat(e.target.value))}
                disabled={trainingStatus === 'training'}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50"
              >
                <option value={0.0001}>0.0001 (Very Slow & Careful)</option>
                <option value={0.01}>0.01 (Optimal / Best)</option>
                <option value={0.5}>0.5 (Too Fast / Confused)</option>
              </select>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                👉 If it learns too fast, it skips important details. If too slow, it takes forever!
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-400 mb-2">
                Practice Rounds (Epochs): <span className="text-white font-bold">{epochs}</span>
              </label>
              <input 
                type="range" 
                min="10" max="200" step="10"
                value={epochs}
                onChange={e => setEpochs(parseInt(e.target.value))}
                disabled={trainingStatus === 'training'}
                className="w-full accent-purple-500 disabled:opacity-50"
              />
              <p className="text-xs text-slate-500 mt-2">
                👉 How many times the AI will read the whole "book" to practice.
              </p>
            </div>

            <button
              onClick={startTraining}
              disabled={trainingStatus === 'training'}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {trainingStatus === 'training' ? 'Training in Progress...' : 'Start Training AI'}
            </button>
          </div>
        </div>

        {/* Middle/Right Panel: Visualization & Testing */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
          
          {/* Live Graph */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex-1">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-lg font-bold text-white mb-1">2. Watch it Learn (Live Graph)</h2>
                <div className="flex flex-wrap gap-4 text-xs font-mono mt-2">
                  <span className="text-pink-400 px-2 py-1 bg-pink-500/10 rounded border border-pink-500/20">
                    ● Mistakes (Loss): {lossHistory.length ? lossHistory[lossHistory.length-1].toFixed(3) : '0.000'}
                  </span>
                  <span className="text-emerald-400 px-2 py-1 bg-emerald-500/10 rounded border border-emerald-500/20">
                    ● Smartness (Accuracy): {accuracyHistory.length ? (accuracyHistory[accuracyHistory.length-1]*100).toFixed(1) : '0.0'}%
                  </span>
                </div>
              </div>
              <div className="text-sm font-mono text-slate-400 bg-slate-950 px-3 py-1 rounded-md border border-slate-800">
                Epoch: {currentEpoch} / {epochs}
              </div>
            </div>

            {/* SVG Graph */}
            <div className="w-full bg-[#0b1120] rounded-xl border border-slate-800/50 p-4 relative overflow-hidden flex items-center justify-center min-h-[250px]">
              {/* Grid Lines */}
              <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              
              <svg width="100%" height={graphHeight} viewBox={`0 0 ${graphWidth} ${graphHeight}`} preserveAspectRatio="none" className="overflow-visible">
                {/* Loss Line (Pink) */}
                <path d={getPath(lossHistory)} fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinejoin="round" />
                {/* Accuracy Line (Emerald) */}
                <path d={getPath(accuracyHistory)} fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" />
              </svg>

              {trainingStatus === 'idle' && lossHistory.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
                  <p className="text-slate-500 font-semibold animate-pulse">Waiting for you to click "Start Training AI"...</p>
                </div>
              )}
            </div>
            
            <p className="text-xs text-slate-500 mt-4 text-center">
              💡 <strong>Goal:</strong> You want the Pink Line (Mistakes) to go DOWN, and the Green Line (Smartness) to go UP!
            </p>
          </div>

          {/* Testing Phase */}
          <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-6 transition-all duration-500 ${trainingStatus === 'complete' ? 'opacity-100 ring-1 ring-purple-500/50' : 'opacity-50 pointer-events-none grayscale'}`}>
            <h2 className="text-lg font-bold text-white mb-2">3. Give the AI a Test!</h2>
            <p className="text-xs text-slate-400 mb-4">Now that the AI has practiced, let's see if it can recognize these things.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-400 mb-3">Select a sample to classify:</p>
                <div className="space-y-2">
                  {TEST_SAMPLES.map(sample => (
                    <button
                      key={sample.id}
                      onClick={() => runTest(sample)}
                      className={`w-full text-left px-4 py-3 rounded-xl border ${selectedTest?.id === sample.id ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'} transition-all`}
                    >
                      <div className="font-semibold text-sm">{sample.name}</div>
                      <div className="text-xs opacity-60">Type: {sample.type}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950 rounded-xl border border-slate-800 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                {selectedTest ? (
                  prediction ? (
                    <div className="animate-fade-in w-full">
                      <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">Model Prediction</div>
                      <div className="text-2xl font-black text-white mb-2">{prediction.label}</div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full border border-slate-700">
                        <span className="text-xs text-slate-400">Confidence:</span>
                        <span className="text-sm font-mono font-bold text-emerald-400">{prediction.confidence}</span>
                      </div>
                      
                      {parseFloat(prediction.confidence) < 50 && (
                        <div className="mt-4 text-xs text-red-400 bg-red-400/10 p-2 rounded">
                          Low confidence! Try training with more Epochs or a better Learning Rate.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                      <p className="text-sm text-slate-400">Analyzing Sample...</p>
                    </div>
                  )
                ) : (
                  <p className="text-sm text-slate-500">Select a sample to see the AI's prediction.</p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
