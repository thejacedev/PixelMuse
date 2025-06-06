import { useState, useEffect } from 'react';
import Head from 'next/head';
import ImageGenerator from '../app/components/ImageGenerator';
import ApiKeyForm from '../app/components/ApiKeyForm';
import TitleBar from '../app/components/TitleBar';
import UpdateNotification from '../app/components/UpdateNotification';
const models = require('../app/modules/models');

export default function Home() {
  const [apiKeys, setApiKeys] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [providers, setProviders] = useState([]);
  const [isEditingKeys, setIsEditingKeys] = useState(false);
  
  
  // Load the API keys from electron-store on component mount
  useEffect(() => {
    const loadApiKeys = async () => {
      try {
        setIsLoading(true);
        
        // Access the Electron API through the contextBridge
        if (window.electron) {
          // Get available providers
          const allProviders = models.getProviders();
          const providerNames = Object.keys(allProviders);
          setProviders(providerNames);
          
          // Load API keys for all providers
          const keys = {};
          
          for (const provider of providerNames) {
            try {
              const apiKey = await window.electron.apiKeys.getApiKey(provider);
              
              if (apiKey) {
                keys[provider] = apiKey;
              }
            } catch (err) {
              console.error(`Error fetching key for ${provider}:`, err);
            }
          }
          
          setApiKeys(keys);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading API keys:', error);
        setIsLoading(false);
      }
    };
    
    loadApiKeys();
  }, []);
  
  // Save API keys to electron-store
  const handleSaveApiKeys = async (newKeys, stayInEditingMode = false) => {
    try {
      
      if (window.electron) {
        // First, determine which keys were removed and should be cleared
        const existingProviders = Object.keys(apiKeys);
        const newProviders = Object.keys(newKeys);
        
        // Find providers that were in the old keys but not in the new keys
        const removedProviders = existingProviders.filter(p => !newProviders.includes(p));
        
        // Save all providers - both new/updated and removed ones
        const allProviders = [...new Set([...existingProviders, ...newProviders])];
        
        for (const provider of allProviders) {
          const key = newKeys[provider] || ''; // Empty string to clear removed keys
          
          try {
            await window.electron.apiKeys.saveApiKey({ 
              provider, 
              key 
            });
          } catch (err) {
            console.error(`Error saving key for ${provider}:`, err);
          }
        }
        
        // Update state with new API keys
        setApiKeys({...newKeys});
        
        // Exit editing mode only if explicitly requested (for Continue button)
        if (!stayInEditingMode) {
          setIsEditingKeys(false);
        }
    
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error saving API keys:', error);
      return false;
    }
  };

  // Handle when the user wants to edit API keys
  const handleEditApiKeys = () => {
    setIsEditingKeys(true);
  };
  
  // Cancel editing and go back to the generator
  const handleCancelEditKeys = () => {
    setIsEditingKeys(false);
  };

  // Check if the user has any API keys set
  const hasAnyApiKey = Object.keys(apiKeys).length > 0;
  
  // Reset all API keys or specific ones
  const handleResetApiKeys = async (newKeys = {}) => {
    console.log("Resetting API keys to:", Object.keys(newKeys));
    await handleSaveApiKeys(newKeys);
    
    // If all keys were cleared, show the form for adding new ones
    if (Object.keys(newKeys).length === 0) {
      setIsEditingKeys(true);
    }
  };
  
  // Determine what to render
  const renderContent = () => {
    if (isLoading) {
      return <div className="loading">Loading...</div>;
    }
    
    if (isEditingKeys || !hasAnyApiKey) {
      return (
        <ApiKeyForm 
          onSave={handleSaveApiKeys} 
          existingKeys={apiKeys}
          onCancel={hasAnyApiKey ? handleCancelEditKeys : null}
        />
      );
    }
    
    return (
      <ImageGenerator 
        apiKey={apiKeys} 
        onResetApiKey={handleResetApiKeys} 
        onEditApiKeys={handleEditApiKeys}
      />
    );
  };
  
  return (
    <>
      <Head>
        <title>PixelMuse</title>
        <meta name="description" content="Generate images with various AI models" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="app-container">
        <TitleBar title="PixelMuse" />
        
        <main className="main-content">
          {renderContent()}
        </main>
        
        <UpdateNotification />
      </div>
    </>
  );
} 