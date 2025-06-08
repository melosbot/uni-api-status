"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SavedApiKey {
  key: string;
  role: string;
}

function useSavedApiKeys() {
  const [savedKeys, setSavedKeys] = useState<SavedApiKey[]>([]);

  const loadSavedKeys = useCallback(() => {
    try {
      const saved = localStorage.getItem("uniapi_saved_keys");
      if (saved) {
        setSavedKeys(JSON.parse(saved));
      } else {
        setSavedKeys([]);
      }
    } catch (error) {
      console.error("Failed to load saved keys:", error);
      setSavedKeys([]);
    }
  }, []);

  const addOrUpdateSavedKey = useCallback((key: string, role: string) => {
    setSavedKeys((prevKeys) => {
      const keys = [...prevKeys];
      const existingIndex = keys.findIndex((k) => k.key === key);
      const newKeyEntry = { key, role };

      if (existingIndex >= 0) {
        keys[existingIndex] = newKeyEntry;
      } else {
        keys.push(newKeyEntry);
      }
      try {
        localStorage.setItem("uniapi_saved_keys", JSON.stringify(keys));
      } catch (error) {
        console.error("Failed to save key:", error);
      }
      return keys;
    });
  }, []);

  const deleteSavedKey = useCallback((keyToDelete: string) => {
    setSavedKeys((prevKeys) => {
      const updated = prevKeys.filter((k) => k.key !== keyToDelete);
      try {
        localStorage.setItem("uniapi_saved_keys", JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to delete key:", error);
      }
      return updated;
    });
  }, []);

  useEffect(() => {
    loadSavedKeys();
  }, [loadSavedKeys]);

  return { savedKeys, loadSavedKeys, addOrUpdateSavedKey, deleteSavedKey };
}

// useApiKeyValidation Hook (无变化)
interface ValidationResult {
  isValid: boolean;
  role?: string;
  error?: string;
}

function useApiKeyValidation() {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const validateKey = useCallback(async (keyToValidate: string): Promise<ValidationResult> => {
    if (!keyToValidate) {
      return { isValid: false, error: "API Key cannot be empty." };
    }
    setIsValidating(true);
    setValidationResult(null); // Reset previous result
    try {
      const response = await fetch("/api/auth/validate-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey: keyToValidate }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        const result: ValidationResult = { isValid: true, role: data.role };
        setValidationResult(result);
        setIsValidating(false);
        return result;
      } else {
        const errorMsg = data.error || "Invalid API Key";
        const result: ValidationResult = { isValid: false, error: errorMsg };
        setValidationResult(result);
        setIsValidating(false);
        return result;
      }
    } catch (error) {
      console.error("Validation request failed:", error);
      const result: ValidationResult = { isValid: false, error: "Validation request failed." };
      setValidationResult(result);
      setIsValidating(false);
      return result;
    }
  }, []);

  const resetValidation = useCallback(() => {
    setValidationResult(null);
    setIsValidating(false);
  }, []);

  return { validateKey, isValidating, validationResult, resetValidation };
}

// useAvailableKeys Hook (无变化)
interface AvailableApiKey {
    api: string;
    role: string;
    name?: string;
}

function useAvailableKeys(adminKey: string | null) {
    const [availableKeys, setAvailableKeys] = useState<AvailableApiKey[]>([]);
    const [isLoadingAvailableKeys, setIsLoadingAvailableKeys] = useState(false);
    const { toast } = useToast();

    const loadAvailableKeys = useCallback(async () => {
        if (!adminKey) {
            setAvailableKeys([]);
            return;
        }

        setIsLoadingAvailableKeys(true);
        setAvailableKeys([]); // Clear previous keys while loading
        try {
            const response = await fetch("/api/auth/available-keys", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ adminKey }),
            });

            if (response.ok) {
                const data = await response.json();
                setAvailableKeys(data.keys || []);
            } else {
                const errorData = await response.json().catch(() => ({}));
                toast({
                    title: "错误",
                    description: `获取可用 API Key 列表失败: ${errorData.error || response.statusText}`,
                    variant: "destructive",
                });
                setAvailableKeys([]);
            }
        } catch (error) {
            toast({
                title: "错误",
                description: "获取可用 API Key 列表时发生网络错误",
                variant: "destructive",
            });
            setAvailableKeys([]);
        } finally {
            setIsLoadingAvailableKeys(false);
        }
    }, [adminKey, toast]);

     // Automatically load when adminKey changes and is valid
     useEffect(() => {
      if (adminKey) {
          loadAvailableKeys();
      } else {
          setAvailableKeys([]); // Clear if adminKey becomes null
      }
  }, [adminKey, loadAvailableKeys]);

    return { availableKeys, loadAvailableKeys, isLoadingAvailableKeys };
}

// --- Component Props ---

interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (key: string, role: string, viewingKey?: string) => void;
  onClear: () => void;
  currentKey?: string;
  currentRole?: string;
  currentViewingKey?: string;
}

// --- Main Component ---

export function ApiKeyModal({
  open,
  onOpenChange,
  onSuccess,
  onClear,
  currentKey = "",
  currentRole = "",
  currentViewingKey = "",
}: ApiKeyModalProps) {
  const { toast } = useToast();

  // State for user input
  const [inputApiKey, setInputApiKey] = useState("");
  const [selectedSavedKey, setSelectedSavedKey] = useState<string>("");
  const [selectedViewingKey, setSelectedViewingKey] = useState<string>("");

  // Custom hooks for logic
  const { savedKeys, loadSavedKeys, addOrUpdateSavedKey, deleteSavedKey } = useSavedApiKeys();
  const { validateKey, isValidating, validationResult, resetValidation } = useApiKeyValidation();

  // Derived state: the key currently being worked with
  const activeKey = useMemo(() => selectedSavedKey || inputApiKey.trim(), [selectedSavedKey, inputApiKey]);
  // Store the role confirmed by the *last successful validation* of the *activeKey*
  const [confirmedRole, setConfirmedRole] = useState<string | null>(null);

  // Hook for loading available keys
   const { availableKeys, isLoadingAvailableKeys } = useAvailableKeys(
       confirmedRole === 'admin' ? activeKey : null
   );

  // Effect to reset state when modal opens or current key changes
  useEffect(() => {
    if (open) {
      loadSavedKeys();
      resetValidation();
      setInputApiKey("");

      if (currentKey) {
        setSelectedSavedKey(currentKey);
        setConfirmedRole(currentRole);
        setSelectedViewingKey(currentViewingKey || (currentRole === 'admin' ? currentKey : ""));
      } else {
        setSelectedSavedKey("");
        setConfirmedRole(null);
        setSelectedViewingKey("");
      }
    }
  }, [open, currentKey, currentRole, currentViewingKey, loadSavedKeys, resetValidation]);

  // --- Event Handlers ---

  const handleSelectSavedKey = useCallback(async (value: string) => {
    if (!value) {
        setSelectedSavedKey("");
        setConfirmedRole(null);
        resetValidation();
        setInputApiKey("");
        setSelectedViewingKey("");
        return;
    }

    setSelectedSavedKey(value);
    setInputApiKey("");
    setConfirmedRole(null);
    setSelectedViewingKey("");

    const result = await validateKey(value);
    if (result.isValid && result.role) {
      setConfirmedRole(result.role);
      addOrUpdateSavedKey(value, result.role);
       if (result.role === 'admin') {
           setSelectedViewingKey(value);
       }
    } else {
      toast({
        title: "验证失败",
        description: `选择的 API Key 验证失败: ${result.error || "未知错误"}。它可能已失效。`,
        variant: "destructive",
      });
    }
  }, [validateKey, toast, addOrUpdateSavedKey, resetValidation]);

  const handleInputApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputApiKey(newValue);
    if (newValue) {
      setSelectedSavedKey("");
      setConfirmedRole(null);
      resetValidation();
      setSelectedViewingKey("");
    }
  };

  const handleValidateInputKey = async () => {
    const keyToValidate = inputApiKey.trim();
    if (!keyToValidate) return; // Button should be disabled, but check anyway

    const result = await validateKey(keyToValidate);
    if (result.isValid && result.role) {
      setConfirmedRole(result.role);
      addOrUpdateSavedKey(keyToValidate, result.role);
      // Toast is optional here as status is shown in input
      // toast({ title: "验证成功", description: `API Key 有效，角色: ${result.role}`, variant: "default" });
       if (result.role === 'admin') {
           setSelectedViewingKey(keyToValidate);
       }
    } else {
      // Keep toast for errors as input space is limited
      toast({
        title: "验证失败",
        description: `API Key 验证失败: ${result.error || "未知错误"}`,
        variant: "destructive",
      });
    }
  };

  // Enhanced handleDeleteSavedKey to fully reset state if the active key is deleted
  const handleDeleteSavedKey = (keyToDelete: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const isDeletingActiveKey = activeKey === keyToDelete;

    deleteSavedKey(keyToDelete);
    toast({ title: "已删除", description: "API Key 已从本地缓存删除" });

    if (isDeletingActiveKey) {
      setSelectedSavedKey("");
      setInputApiKey(""); // Also clear input just in case
      setConfirmedRole(null);
      resetValidation();
      setSelectedViewingKey("");
      // useAvailableKeys hook will automatically clear its state as adminKey becomes null
    } else if (selectedSavedKey === keyToDelete) {
        // If deleting a selected key which wasn't the 'active' one (e.g., mid-input)
        setSelectedSavedKey(""); // Still clear selection
        // Don't reset validation if it was for the input field
    }
  };

  const handleViewingKeyChange = (value: string) => {
    setSelectedViewingKey(value);
  };

  const handleConfirm = () => {
    if (!activeKey || !confirmedRole) {
      toast({ title: "错误", description: "请先选择或输入并成功验证一个 API Key", variant: "destructive" });
      return;
    }
    if (confirmedRole === "admin" && !selectedViewingKey) {
       if (isLoadingAvailableKeys) {
           toast({ title: "请稍候", description: "正在加载可查看的 Key 列表...", variant: "default" });
           return;
       }
       toast({ title: "错误", description: "请选择一个要查看统计的 API Key", variant: "destructive" });
       return;
    }
    onSuccess(activeKey, confirmedRole, confirmedRole === "admin" ? selectedViewingKey : undefined);
    onOpenChange(false);
  };

  const handleClearCurrent = () => {
    onClear();
    onOpenChange(false);
  };

  // --- Render Helpers ---

  const getRoleBadge = (role: string | undefined | null, compact: boolean = false) => {
    if (!role) return null;
    const isAdmin = role === "admin";
    return (
      <Badge variant={isAdmin ? "default" : "secondary"} className="text-xs whitespace-nowrap">
        {isAdmin ? "管理员" : "用户"}
      </Badge>
    );
  };

  const isConfirmDisabled = useMemo(() => {
    if (!activeKey || !confirmedRole) return true;
    if (confirmedRole === "admin" && !selectedViewingKey) return true;
    if (isValidating || isLoadingAvailableKeys) return true;
    return false;
  }, [activeKey, confirmedRole, selectedViewingKey, isValidating, isLoadingAvailableKeys]);

  // Helper to render validation status inside input
  const renderInputValidationStatus = () => {
      // Only show status if the input field is the active key
      if (activeKey !== inputApiKey.trim() || !inputApiKey.trim()) {
          return null;
      }

      const commonClasses = "absolute inset-y-0 right-0 pr-3 flex items-center space-x-1"; // Added space-x-1

      if (isValidating) {
          return <div className={commonClasses}><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;
      }

      if (validationResult) {
          if (validationResult.isValid) {
              return (
                  <div className={commonClasses}>
                      {getRoleBadge(validationResult.role, true)}
                      <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
              );
          } else {
              return (
                  <div className={commonClasses} title={validationResult.error}>
                       <AlertCircle className="h-4 w-4 text-red-600" />
                  </div>
              );
          }
      }
      return null; // No validation occurred or needed for the input yet
  };

  // --- Render ---

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Reduced max-width for compactness */}
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>API Key 设置</DialogTitle>
          {/* Slightly more concise description */}
          <DialogDescription>选择已存 Key 或输入新 Key 进行验证。</DialogDescription>
        </DialogHeader>
        {/* Reduced vertical spacing */}
        <div className="space-y-3 py-1">

          {/* API Key 选择 - Reduced bottom margin */}
          <div className="space-y-1">
            <Label>选择已保存的 Key</Label>
            <Select value={selectedSavedKey} onValueChange={handleSelectSavedKey} >
              <SelectTrigger className="flex-1">
                 {/* Show selected key preview in trigger */}
                 {selectedSavedKey ? (
                     <div className="flex items-center justify-between w-full min-w-0 pr-2">
                         <span className="font-mono text-sm truncate flex-1 text-left">
                             {`${selectedSavedKey.substring(0, 8)}...${selectedSavedKey.substring(selectedSavedKey.length - 4)}`}
                         </span>
                         <div className="flex items-center space-x-1.5 ml-2 flex-shrink-0 justify-end">
                            {getRoleBadge(confirmedRole || savedKeys.find(k => k.key === selectedSavedKey)?.role)}
                             {/* Validation status icon */}
                             {isValidating && activeKey === selectedSavedKey && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                             {validationResult && activeKey === selectedSavedKey && !isValidating && (
                                validationResult.isValid ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-red-600" title={validationResult.error}/>
                             )}
                         </div>
                     </div>
                 ) : (
                     <SelectValue placeholder="从列表中选择 Key" />
                 )}
              </SelectTrigger>
              <SelectContent>
                {savedKeys.length === 0 && <SelectItem value="no-keys" disabled>没有已保存的 Key</SelectItem>}
                {savedKeys.map((savedKey) => (
                  <SelectItem key={savedKey.key} value={savedKey.key}>
                    {/* Updated Display: Key (Short) | Role Badge | Delete Button */}
                    <div className="flex items-center justify-between w-full min-w-0">
                      <span className="font-mono text-sm truncate flex-1" title={savedKey.key}>
                        {`${savedKey.key.substring(0, 8)}...${savedKey.key.substring(savedKey.key.length - 4)}`}
                      </span>
                      <div className="flex items-center space-x-1.5 ml-2 flex-shrink-0">
                        {/* Use role from saved data as default */}
                        {getRoleBadge(savedKey.role)}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                          onClick={(e) => handleDeleteSavedKey(savedKey.key, e)}
                          title={`删除 Key`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Error message specifically for selected key validation failure */}
            {selectedSavedKey && validationResult && activeKey === selectedSavedKey && !isValidating && !validationResult.isValid && (
                 <p className="text-xs text-red-600 px-1">{validationResult.error}</p>
            )}
          </div>

          {/* Divider - Reduced margin */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">或</span>
            </div>
          </div>

          {/* 新 API Key 输入 - Input with inline validation status */}
          <div className="space-y-1">
            <Label htmlFor="apikey-input">输入新的 API Key</Label>
             <div className="flex items-center space-x-2">
                {/* Relative container for input and status */}
                <div className="relative flex-1">
                    <Input
                        id="apikey-input"
                        type="password"
                        placeholder="sk-..."
                        value={inputApiKey}
                        onChange={handleInputApiKeyChange}
                        // Add padding-right to avoid overlap with status icons/badge
                        // Adjust pr-16/pr-20 based on expected width of status elements
                        className="pr-16 sm:pr-20"
                        disabled={!!selectedSavedKey} // Disable input if a saved key is selected
                    />
                    {/* Render status inside the input */}
                    {renderInputValidationStatus()}
                </div>
                <Button
                    onClick={handleValidateInputKey}
                    disabled={!inputApiKey.trim() || isValidating || !!selectedSavedKey}
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap"
                    aria-label="验证输入的 API Key"
                >
                    {isValidating && activeKey === inputApiKey.trim() ? (
                       <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> 验证中...</>
                    ) : (
                        "验证" // Shorter button text
                    )}
                </Button>
             </div>
             {/* Removed the separate validation status div below input */}
          </div>

          {/* 管理员查看统计的 Key 选择 - Reduced top padding */}
          {confirmedRole === "admin" && (
            <div className="space-y-1 pt-1">
              <Label>选择查看统计的 Key</Label> {/* Shorter Label */}
              <Select value={selectedViewingKey} onValueChange={handleViewingKeyChange} disabled={isLoadingAvailableKeys}>
                <SelectTrigger>
                   {/* Show selected viewing key preview */}
                   {selectedViewingKey ? (
                       <div className="flex items-center justify-between w-full min-w-0 pr-2">
                           <span className="font-mono text-sm truncate flex-1 text-left">
                               {availableKeys.find(k => k.api === selectedViewingKey)?.name || `${selectedViewingKey.substring(0, 8)}...${selectedViewingKey.substring(selectedViewingKey.length - 4)}`}
                           </span>
                           {getRoleBadge(availableKeys.find(k => k.api === selectedViewingKey)?.role)}
                       </div>
                   ) : (
                        <SelectValue placeholder={isLoadingAvailableKeys ? "加载可用 Key..." : "选择查看的 Key"} />
                   )}
                </SelectTrigger>
                <SelectContent>
                  {isLoadingAvailableKeys ? (
                    <div className="flex items-center justify-center p-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> 加载中...
                    </div>
                  ) : (
                     availableKeys.length === 0 ?
                     <SelectItem value="no-available-keys" disabled>无可用 Key</SelectItem>
                     :
                    availableKeys.map((key) => (
                      <SelectItem key={key.api} value={key.api}>
                        <div className="flex items-center w-full min-w-0">
                           <span className="font-mono text-sm truncate flex-1 text-left mr-2" title={key.api}>
                            {key.api.substring(0, 8)}...{key.api.substring(key.api.length - 4)}
                          </span>
                          <div className="ml-auto flex-shrink-0">{getRoleBadge(key.role)}</div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
               {!isLoadingAvailableKeys && confirmedRole === 'admin' && activeKey && availableKeys.length === 0 && (
                    <p className="text-xs text-muted-foreground px-1 pt-1">未能加载或没有可供查看的 Key。</p>
                )}
            </div>
          )}

          {/* Action Buttons - Reduced top padding */}
          <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0 pt-3">
             <Button
                onClick={handleConfirm}
                disabled={isConfirmDisabled}
                className="flex-1"
             >
                {(isValidating || isLoadingAvailableKeys) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                确认使用
            </Button>
            <Button variant="outline" onClick={handleClearCurrent}>
              清除当前设置
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}