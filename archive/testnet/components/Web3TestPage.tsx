import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Wrench } from 'lucide-react'
import USDCContractDiagnostic from '../web3/USDCContractDiagnostic'
import USDCFaucetHelper from '../web3/USDCFaucetHelper'

export default function Web3TestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Page Header */}
        <Card className="bg-black/30 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Wrench className="w-6 h-6 mr-3 text-blue-400" />
              Web3 Contract Testing & Diagnostics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400">
              Use these tools to test and diagnose Web3 contract interactions, specifically the USDC faucet functionality.
            </p>
          </CardContent>
        </Card>

        {/* USDC Contract Diagnostic */}
        <USDCContractDiagnostic />

        {/* USDC Faucet Helper */}
        <USDCFaucetHelper />

      </div>
    </div>
  )
}