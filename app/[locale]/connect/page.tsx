"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  DEMO_STELLAR_ADDRESS,
  markDemoMode,
  clearDemoMode,
} from "@/app/data/demoAccount";

export default function ConnectPage() {
  const router = useRouter();
  const { setAddress, setError, setStatus, network, reset } = useWrapStore();
  const { resetTransaction } = useTransactionStore();
  const { reset: resetMultiTimeframe } = useMultiTimeframeStore();
  const { playSound } = useSound();
  const isOnline = useOnlineStatus();

  const {
    address: walletAddress,
    validationState,
    errorMessage,
    handleAddressChange: handleRawAddressChange,
    isValid,
  } = useStellarAddressValidation({ network });

  const [isConnecting, setIsConnecting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Refs for focus management
  const mainContentRef = useRef<HTMLDivElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const connectButtonRef = useRef<HTMLButtonElement>(null);
  const freighterButtonRef = useRef<HTMLButtonElement>(null);
  const demoButtonRef = useRef<HTMLButtonElement>(null);

  // Load last-used address from localStorage on mount
  useEffect(() => {
    // Returning to /connect always leaves demo mode; handleDemoMode re-arms it.
    clearDemoMode();

    const saved = localStorage.getItem("lastUsedStellarAddress");
    if (saved) {
      setLastUsedAddress(saved);
    }
    // Focus the main content area on mount
    if (mainContentRef.current) {
      mainContentRef.current.focus();
    }
  }, []);

  };

  const handleFreighterConnect = async () => {
    if (!isOnline) {
      setLocalError("Wallet connect is unavailable offline.");
      return;
    }

    setIsConnecting(true);
    setLocalError(null);
    setStatus("loading");
    // Reset all stores before connecting
    reset();
    resetTransaction();
    resetMultiTimeframe();

    try {
      const publicKey = await connectFreighter(network);
      setAddress(publicKey);
      saveAddressToLocalStorage(publicKey);
      setError(null);
      playSound(SOUND_NAMES.SLIDE_WHOOSH);
      await fetchAccountPreview(publicKey);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to connect wallet";
      setError(errorMessage);
      setLocalError(errorMessage);
      setStatus("error");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAlbedoConnect = async () => {
    if (!isOnline) {
      setLocalError("Wallet connect is unavailable offline.");
      return;
    }

    setIsConnecting(true);
    setLocalError(null);
    setStatus("loading");
    // Reset all stores before connecting
    reset();
    resetTransaction();
    resetMultiTimeframe();

    try {
      const publicKey = await connectAlbedo(network);
      setAddress(publicKey);
      saveAddressToLocalStorage(publicKey);
      setError(null);
      playSound(SOUND_NAMES.SLIDE_WHOOSH);
      await fetchAccountPreview(publicKey);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to connect wallet";
      setError(errorMessage);
      setLocalError(errorMessage);
      setStatus("error");
    } finally {
      setIsConnecting(false);
    }
  };


  const handleXBullConnect = async () => {
    if (!isOnline) {
      setLocalError("Wallet connect is unavailable offline.");
      return;
    }

    if (!isXBullInstalled()) {
      setLocalError("xBull wallet not found. Please install it from the Chrome Web Store.");
      window.open(
        "https://chromewebstore.google.com/detail/xbull-wallet/klpfklhikflhefnndkhiokkdbndlfhno",
        "_blank"
      );
      return;
    }

    setIsConnecting(true);
    setLocalError(null);
    setStatus("loading");
    // Reset all stores before connecting
    reset();
    resetTransaction();
    resetMultiTimeframe();

    try {
      const publicKey = await connectXBull(network);
      setAddress(publicKey);
      setError(null);
      playSound(SOUND_NAMES.SLIDE_WHOOSH);
      router.push("/loading");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to connect wallet";
      setError(errorMessage);
      setLocalError(errorMessage);
      setStatus("error");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleWalletConnectConnect = async () => {
    if (!isOnline) {
      setLocalError("Wallet connect is unavailable offline.");
      return;
    }

    setIsConnecting(true);
    setLocalError(null);
    setStatus("loading");
    // Reset all stores before connecting
    reset();
    resetTransaction();
    resetMultiTimeframe();

    try {
      const publicKey = await connectWalletConnect(network);
      setAddress(publicKey);
      setError(null);
      playSound(SOUND_NAMES.SLIDE_WHOOSH);
      router.push("/loading");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to connect wallet";
      setError(errorMessage);
      setLocalError(errorMessage);
      setStatus("error");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!isOnline) {
      setLocalError("Indexing is unavailable offline.");
      return;
    }

    if (!walletAddress.trim()) {
      setLocalError("Please enter a wallet address");
      return;
    }

    // Validate Stellar address format
    if (!isValid) {
      setLocalError("Invalid wallet address. Please wait for validation.");
      setError("Invalid wallet address");
      return;
    }

    // Reset all stores before connecting
    reset();
    resetTransaction();
    resetMultiTimeframe();

    const trimmedAddress = walletAddress.trim();
    setAddress(trimmedAddress);
    saveAddressToLocalStorage(trimmedAddress);
    playSound(SOUND_NAMES.SLIDE_WHOOSH);
    fetchAccountPreview(walletAddress.trim());
  };

  const handleContinue = () => {
    router.push("/loading");
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleRawAddressChange(e.target.value);
    setLocalError(null);
    setError(null);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleRawAddressChange(text);
      setLocalError(null);
      setError(null);
      // Keep focus on input after paste
      if (addressInputRef.current) {
        addressInputRef.current.focus();
      }
    } catch {
      setError("Failed to paste from clipboard");
    }
  };

  const handleConnect = () => {
    handleManualSubmit();
  };

  const handleDemoMode = () => {
    if (!isOnline) {
      setLocalError("Demo indexing is unavailable offline.");
      return;
    }

    // Demo mode is mock-only; the flag makes the loading screen skip Horizon.
    markDemoMode();
    handleRawAddressChange(DEMO_STELLAR_ADDRESS);
    setTimeout(() => {
      setAddress(DEMO_STELLAR_ADDRESS);
      setStatus("loading");
      playSound(SOUND_NAMES.SLIDE_WHOOSH);
      router.push("/loading");
    }, 100);
  };

  const onBack = () => {
    router.push("/");
  };

  // Keyboard event handlers
  const handleBackKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onBack();
    }
  };

  const handleConnectKeyDown = (e: KeyboardEvent) => {
    if (
      (e.key === "Enter" || e.key === " ") &&
      !isConnecting &&
      walletAddress.trim()
    ) {
      e.preventDefault();
      handleConnect();
    }
  };

  const handleFreighterKeyDown = (e: KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && !isConnecting) {
      e.preventDefault();
      handleFreighterConnect();
    }
  };

  const handleAlbedoKeyDown = (e: KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && !isConnecting) {
      e.preventDefault();
      handleAlbedoConnect();
    }
  };


  const handleXBullKeyDown = (e: KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && !isConnecting) {
      e.preventDefault();
      handleXBullConnect();
    }
  };

  const handleWalletConnectKeyDown = (e: KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && !isConnecting) {
      e.preventDefault();
      handleWalletConnectConnect();
    }
  };

  const handleDemoKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleDemoMode();
    }
  };

  const handlePasteKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handlePaste();
    }
  };

  const handleAddressKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && walletAddress.trim()) {
      e.preventDefault();
      handleManualSubmit();
    }
  };

  // Keyboard navigation for the entire page
  const handlePageKeyDown = (e: KeyboardEvent) => {
    // Handle Escape key to go back
    if (e.key === "Escape") {
      e.preventDefault();
      onBack();
    }

    // Handle Tab key for focus trapping
    if (e.key === "Tab" && mainContentRef.current) {
      const focusableElements = mainContentRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      if (focusableElements.length > 0) {
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[
          focusableElements.length - 1
        ] as HTMLElement;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  const errorId = localError ? "address-error" : undefined;

  return (
    <div
      ref={mainContentRef}
      tabIndex={-1}
      onKeyDown={handlePageKeyDown}
      className="relative w-full min-h-screen h-screen overflow-hidden flex items-center justify-center bg-theme-background focus:outline-none" style={{ touchAction: "pan-y" }}
    >
      {/* Progress Indicator */}
      <ProgressIndicator currentStep={2} totalSteps={6} showNext={false} />

      {/* Background elements */}
      <div className="absolute inset-0 bg-linear-to-br from-black via-black to-black opacity-60" />

      {/* Animated grid background */}
      <div className="absolute inset-0 opacity-20">
        <motion.div
          className="w-full h-full"
          style={{
            backgroundImage: `linear-gradient(rgba(var(--color-theme-primary-rgb), 0.3) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(var(--color-theme-primary-rgb), 0.3) 1px, transparent 1px)`,
            backgroundSize: "100px 100px",
          }}
          animate={{
            backgroundPosition: ["0px 0px", "100px 100px"],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      {/* Glowing orbs */}
      <motion.div
        className="absolute w-96 h-96 rounded-full blur-[120px]"
        style={{ backgroundColor: "rgba(var(--color-theme-primary-rgb), 0.3)" }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.5, 0.3],
          x: [-50, 50, -50],
          y: [-50, 50, -50],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Back button */}
      <motion.button
        ref={backButtonRef}
        onClick={onBack}
        onKeyDown={handleBackKeyDown}
        className="absolute top-6 left-6 md:top-8 md:left-8 z-20 group focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2 focus:ring-offset-black focus:rounded-xl"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        tabIndex={0}
        aria-label="Go back to previous page"
        role="button"
      >
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl backdrop-blur-xl border border-white/20"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <ArrowLeft
            className="w-5 h-5 text-white group-hover:text-white/80 transition-colors"
            aria-hidden="true"
          />
          <span className="text-sm font-black text-white/80 group-hover:text-white transition-colors hidden sm:inline">
            BACK
          </span>
        </div>
      </motion.button>

      <motion.div
        className="absolute top-6 right-6 md:top-8 md:right-8 z-20"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <MuteToggle />
      </motion.div>

      {/* Main content */}
      <div className="relative z-10 max-w-2xl w-full mx-auto px-4 sm:px-6 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-8 md:mb-12"
        >
          <motion.div
            className="inline-block mb-6"
            animate={{
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
            }}
          >
            <div className="relative">
              <motion.div
                className="absolute inset-0 blur-2xl rounded-full"
                style={{
                  backgroundColor: "rgba(var(--color-theme-primary-rgb), 0.4)",
                }}
                animate={{
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              />
              <div
                className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center border-2"
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.7)",
                  borderColor: "rgba(var(--color-theme-primary-rgb), 0.5)",
                }}
              >
                <Wallet
                  className="w-10 h-10 sm:w-12 sm:h-12"
                  style={{ color: "var(--color-theme-primary)" }}
                  aria-hidden="true"
                />
              </div>
            </div>
          </motion.div>

          <h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-3 md:mb-4 tracking-tight leading-none"
            style={{
              background: `linear-gradient(180deg, #ffffff 0%, var(--color-theme-primary) 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            CONNECT WALLET
          </h1>
          <p className="text-base sm:text-lg md:text-xl font-bold text-white/70 leading-relaxed">
            Enter your Stellar wallet address to unwrap your 2026 journey
          </p>
        </motion.div>

        {/* Last-used address shortcut */}
        {lastUsedAddress && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-6 max-w-2xl mx-auto"
          >
            <motion.button
              onClick={() => {
                reset();
                resetTransaction();
                resetMultiTimeframe();
                setAddress(lastUsedAddress);
                playSound(SOUND_NAMES.SLIDE_WHOOSH);
                router.push("/loading");
              }}
              className="w-full px-6 py-4 bg-gradient-to-r from-white/10 to-white/5 border-2 rounded-xl font-bold text-white hover:from-white/20 hover:to-white/10 transition-all flex items-center justify-center gap-3 focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2 focus:ring-offset-black"
              style={{
                borderColor: "rgba(var(--color-theme-primary-rgb), 0.5)",
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              tabIndex={0}
              aria-label={`Continue as ${lastUsedAddress.slice(0, 4)}...${lastUsedAddress.slice(-4)}`}
              role="button"
            >
              <CheckCircle
                className="w-5 h-5"
                style={{ color: "var(--color-theme-primary)" }}
                aria-hidden="true"
              />
              <span className="text-sm sm:text-base">
                Continue as {lastUsedAddress.slice(0, 4)}...{lastUsedAddress.slice(-4)}
              </span>
            </motion.button>
            <button
              onClick={clearSavedAddress}
              className="w-full mt-2 text-xs sm:text-sm text-white/50 hover:text-white/70 transition-colors font-medium"
              tabIndex={0}
              aria-label="Use a different wallet"
            >
              Use a different wallet
            </button>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="relative"
        >
          <motion.div
            className="absolute -inset-1 rounded-2xl blur-xl"
            style={{
              backgroundColor: "rgba(var(--color-theme-primary-rgb), 0.3)",
            }}
            animate={{
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          />

          <div
            className="relative backdrop-blur-xl p-6 sm:p-8 rounded-2xl border"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              borderColor: "rgba(var(--color-theme-primary-rgb), 0.3)",
            }}
          >
            <label
              htmlFor="wallet-address"
              className="block text-sm font-black text-white/70 mb-3 tracking-wider"
            >
              STELLAR ADDRESS
            </label>

            <div className="relative mb-6">
              <input
                ref={addressInputRef}
                id="wallet-address"
                type="text"
                value={walletAddress}
                onChange={handleAddressChange}
                onKeyDown={handleAddressKeyDown}
                placeholder="Paste your Stellar address here"
                className="w-full px-5 py-4 rounded-xl font-mono text-sm sm:text-base border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2 focus:ring-offset-black"
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                  borderColor: localError
                    ? "rgba(239, 68, 68, 0.5)"
                    : "rgba(255, 255, 255, 0.1)",
                  color: "white",
                }}
                tabIndex={0}
                aria-label="Stellar wallet address input"
                aria-required="true"
                aria-invalid={!!localError}
                aria-describedby={errorId}
                aria-errormessage={errorId}
                autoComplete="off"
              />

              <motion.button
                onClick={handlePaste}
                onKeyDown={handlePasteKeyDown}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2 focus:ring-offset-black"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                tabIndex={0}
                aria-label="Paste from clipboard"
                role="button"
              >
                <Copy
                  className="w-5 h-5"
                  style={{ color: "var(--color-theme-primary)" }}
                  aria-hidden="true"
                />
              </motion.button>
              <AnimatePresence mode="popLayout">
                {validationState === "validating" ||
                validationState === "indexing" ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute right-12 top-1/2 -translate-y-1/2 pr-2 border-r border-white/20"
                  >
                    <div className="w-5 h-5 border-2 border-theme-primary border-t-transparent rounded-full animate-spin" />
                  </motion.div>
                ) : validationState === "valid" ? (
                  <motion.div
                    key="valid"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute right-12 top-1/2 -translate-y-1/2 pr-2 border-r border-white/20"
                  >
                    <CheckCircle
                      className="w-5 h-5 text-green-500"
                      aria-hidden="true"
                    />
                  </motion.div>
                ) : validationState === "invalid" ||
                  validationState === "invalid-format" ||
                  validationState === "wrong-network" ||
                  validationState === "not-found" ||
                  validationState === "error" ? (
                  <motion.div
                    key="invalid"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute right-12 top-1/2 -translate-y-1/2 pr-2 border-r border-white/20"
                  >
                    <XCircle
                      className="w-5 h-5 text-red-500"
                      aria-hidden="true"
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {/* Validation State Feedback Messages */}
            <AnimatePresence mode="popLayout">
              {validationState === "validating" && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 bg-yellow-500/10 border-2 border-yellow-500/50 rounded-xl text-yellow-500 text-sm text-center font-medium"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                    Checking account...
                  </div>
                </motion.div>
              )}
              {validationState === "indexing" && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 bg-theme-primary/10 border-2 border-theme-primary/50 rounded-xl text-theme-primary text-sm text-center font-medium"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-theme-primary border-t-transparent rounded-full animate-spin" />
                    Indexing transactions...
                  </div>
                </motion.div>
              )}
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  id="address-error"
                  role="alert"
                  aria-live="assertive"
                  aria-atomic="true"
                  className="mb-6 p-4 bg-red-500/10 border-2 border-red-500/50 rounded-xl text-red-400 text-sm text-center font-medium"
                >
                  ⚠️ {errorMessage}
                </motion.div>
              )}
              {localError && !errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 bg-red-500/10 border-2 border-red-500/50 rounded-xl text-red-400 text-sm text-center font-medium"
                >
                  ⚠️ {localError}
                </motion.div>
              )}
              {!isOnline && !localError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 bg-yellow-500/10 border-2 border-yellow-500/50 rounded-xl text-yellow-400 text-sm text-center font-medium"
                >
                  You&apos;re offline — wallet connect and indexing are disabled.
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {showPreview && (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-6 bg-theme-primary/10 border-2 border-theme-primary/50 rounded-xl"
                >
                  <h3 className="text-sm font-bold text-white/80 mb-4 tracking-wide">ACCOUNT SUMMARY</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 text-sm">Network</span>
                      <span className="text-white font-bold">{network === "testnet" ? "Testnet" : "Mainnet"}</span>
                    </div>
                    {previewLoading ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-white/60 text-sm">Balance</span>
                          <div className="w-20 h-5 bg-white/10 rounded animate-pulse" />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white/60 text-sm">Recent Transactions</span>
                          <div className="w-20 h-5 bg-white/10 rounded animate-pulse" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-white/60 text-sm">XLM Balance</span>
                          <span className="text-white font-bold">{previewBalance} XLM</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white/60 text-sm">Total Operations</span>
                          <span className="text-white font-bold">{previewTxCount}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <motion.button
                    onClick={handleContinue}
                    className="w-full mt-4 px-6 py-3 rounded-xl font-bold text-black bg-theme-primary hover:bg-theme-primary/90 transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2 focus:ring-offset-black"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span>CONTINUE</span>
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {!showPreview && (
              <motion.button
                ref={connectButtonRef}
                onClick={handleConnect}
              onKeyDown={handleConnectKeyDown}
              disabled={!isOnline || !walletAddress.trim() || isConnecting || !isValid}
              className="w-full relative group disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
              whileHover={{
                scale: !isOnline || !walletAddress.trim() || isConnecting || !isValid ? 1 : 1.02,
              }}
              whileTap={{
                scale: !isOnline || !walletAddress.trim() || isConnecting || !isValid ? 1 : 0.98,
              }}
              tabIndex={0}
              aria-label={
                !isOnline
                  ? "Indexing unavailable offline"
                  : isConnecting
                    ? "Connecting wallet"
                    : "Start wrapping process"
              }
              aria-disabled={!isOnline || !walletAddress.trim() || isConnecting || !isValid}
              role="button"
            >
              <motion.div
                className="absolute -inset-1 rounded-xl blur-lg"
                style={{
                  backgroundColor: "rgba(var(--color-theme-primary-rgb), 0.4)",
                }}
                animate={{
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              />

              <div
                className="relative px-8 py-5 rounded-xl font-black text-lg sm:text-xl tracking-tight transition-all duration-200 flex items-center justify-center gap-3 focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2 focus:ring-offset-black"
                style={{
                  backgroundColor: isConnecting
                    ? "rgba(var(--color-theme-primary-rgb), 0.5)"
                    : "var(--color-theme-primary)",
                  color: "#000000",
                  cursor:
                    !isOnline || !walletAddress.trim() || isConnecting || !isValid
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {!isOnline ? (
                  "OFFLINE"
                ) : isConnecting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>CONNECTING...</span>
                  </>
                ) : (
                  "START WRAPPING"
                )}
              </div>
            </motion.button>
            )}
            </AnimatePresence>

            {/* Wallet Connect Options */}
            <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
              <p className="text-center text-sm font-medium text-white/50 mb-4">
                or connect with
              </p>
              <motion.button
                ref={freighterButtonRef}
                onClick={handleFreighterConnect}
                onKeyDown={handleFreighterKeyDown}
                disabled={!isOnline || isConnecting}
                className="w-full px-6 py-4 bg-transparent border-2 rounded-xl font-bold text-white/70 hover:text-white transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2 focus:ring-offset-black"
                style={{
                  borderColor: "rgba(var(--color-theme-primary-rgb), 0.3)",
                }}
                whileHover={{ scale: !isOnline || isConnecting ? 1 : 1.02 }}
                whileTap={{ scale: !isOnline || isConnecting ? 1 : 0.98 }}
                tabIndex={0}
                aria-label="Connect with Freighter wallet"
                aria-disabled={!isOnline || isConnecting}
                role="button"
              >
                {isConnecting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Wallet
                      className="w-5 h-5"
                      style={{ color: "var(--color-theme-primary)" }}
                      aria-hidden="true"
                    />
                    <span>Connect with Freighter</span>
                  </>
                )}
              </motion.button>

              <motion.button
                onClick={handleAlbedoConnect}
                onKeyDown={handleAlbedoKeyDown}
                disabled={!isOnline || isConnecting}
                className="w-full px-6 py-4 bg-transparent border-2 rounded-xl font-bold text-white/70 hover:text-white transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2 focus:ring-offset-black"
                style={{
                  borderColor: "rgba(var(--color-theme-primary-rgb), 0.3)",
                }}
                whileHover={{ scale: !isOnline || isConnecting ? 1 : 1.02 }}
                whileTap={{ scale: !isOnline || isConnecting ? 1 : 0.98 }}
                tabIndex={0}
                aria-label="Connect with Albedo wallet"
                aria-disabled={!isOnline || isConnecting}
                role="button"
              >
                {isConnecting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Wallet
                      className="w-5 h-5"
                      style={{ color: "var(--color-theme-primary)" }}
                      aria-hidden="true"
                    />
                    <span>Connect with Albedo</span>
                  </>
                )}
              </motion.button>

              <motion.button
                onClick={handleXBullConnect}
                onKeyDown={handleXBullKeyDown}
                disabled={!isOnline || isConnecting}
                className="w-full px-6 py-4 bg-transparent border-2 rounded-xl font-bold text-white/70 hover:text-white transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2 focus:ring-offset-black"
                style={{
                  borderColor: "rgba(var(--color-theme-primary-rgb), 0.3)",
                }}
                whileHover={{ scale: !isOnline || isConnecting ? 1 : 1.02 }}
                whileTap={{ scale: !isOnline || isConnecting ? 1 : 0.98 }}
                tabIndex={0}
                aria-label="Connect with xBull wallet"
                aria-disabled={!isOnline || isConnecting}
                role="button"
              >
                {isConnecting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Wallet
                      className="w-5 h-5"
                      style={{ color: "var(--color-theme-primary)" }}
                      aria-hidden="true"
                    />
                    <span>Connect with xBull</span>
                  </>
                )}
              </motion.button>

              <motion.button
                onClick={handleWalletConnectConnect}
                onKeyDown={handleWalletConnectKeyDown}
                disabled={!isOnline || isConnecting}
                className="w-full px-6 py-4 bg-transparent border-2 rounded-xl font-bold text-white/70 hover:text-white transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2 focus:ring-offset-black"
                style={{
                  borderColor: "rgba(var(--color-theme-primary-rgb), 0.3)",
                }}
                whileHover={{ scale: !isOnline || isConnecting ? 1 : 1.02 }}
                whileTap={{ scale: !isOnline || isConnecting ? 1 : 0.98 }}
                tabIndex={0}
                aria-label="Connect with WalletConnect mobile wallets"
                aria-disabled={!isOnline || isConnecting}
                role="button"
              >
                {isConnecting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <QrCode
                      className="w-5 h-5"
                      style={{ color: "var(--color-theme-primary)" }}
                      aria-hidden="true"
                    />
                    <span>Connect with WalletConnect</span>
                  </>
                )}
              </motion.button>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-xs sm:text-sm text-white/50 text-center mb-3">
                Don&apos;t have a Stellar wallet?{" "}
                <a
                  href="https://stellar.org/wallets"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold hover:text-white/80 transition-colors focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2 focus:ring-offset-black focus:rounded"
                  style={{ color: "var(--color-theme-primary)" }}
                  tabIndex={0}
                  aria-label="Learn how to get a Stellar wallet (opens in new window)"
                >
                  Get one here
                </a>
              </p>
              <motion.button
                ref={demoButtonRef}
                onClick={handleDemoMode}
                onKeyDown={handleDemoKeyDown}
                className="w-full text-xs sm:text-sm font-bold text-white/40 hover:text-white/60 transition-colors focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2 focus:ring-offset-black focus:rounded"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                tabIndex={0}
                aria-label="Try demo mode"
                role="button"
              >
                Or click here to try demo mode →
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
