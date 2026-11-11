'use client';

import { useState, useEffect }    from 'react';
import PortfolioUI                from './PortfolioUI';
import Portfolio                  from './Portfolio'; 
import RankUI                     from '../Manage_Rank/RankUI';
import { GlobalSettings_modal }   from './GlobalSettings_modal';
import { FileModal }              from '../File/FileModal';
import { PortfolioModal_Rename }  from '../PortfolioManagement/PortfolioModal_Rename';
import { PortfolioModal_Create }  from '../PortfolioManagement/PortfolioModal_Create';
import { PortfolioModal_Delete }  from '../PortfolioManagement/PortfolioModal_Delete';
import { HelpTrigger }            from '../Help/HelpTrigger';
import { useHelp }                from '../Help/HelpContext';
import { Hint }                   from '../Help/Hint';
import { initialSettings, subscribeToSettingsChange } from './GlobalSettings';

import '../Styles/Global/Help.css';

export default function LibraryUI({ showLibrary, setShowLibrary, onGoHome, repository, updateRepository, symbolList, isGuest }) {
    const [portfolios, setPortfolios] = useState([]);
    //const [refreshTick, setRefreshTick] = useState(0);

    // Modals visibility state
    const [showCreateModal,   setShowCreateModal]   = useState(false);
    const [showDeleteModal,   setShowDeleteModal]   = useState(false);
    const [showRenameModal,   setShowRenameModal]   = useState(false);
    const [showFileModal,     setShowFileModal]     = useState(false);
    const [showRankModal,     setShowRankModal]     = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    // Form tracking states
    const [newPortfolioName, setNewPortfolioName] = useState("");
    const [createError, setCreateError]           = useState("");
    const [selectedId, setSelectedId]             = useState("");

    useEffect(() => {
        subscribeToSettingsChange(() => {
            //setPortfolios(currentPortfolios => currentPortfolios.map(p => ({ ...p, isStale: true })) );
        });
    }, []);

    const { openHelp } = useHelp();

    // Phase 1: Initialize form and open the Create Modal
    const handleOpenCreateModal = () => {
        setNewPortfolioName("");
        setCreateError("");
        setShowCreateModal(true);
    };

  // Phase 2: Process validation and construct the new portfolio
const handleConfirmCreate = (submittedName) => {
    // Standardize input from local modal state
    const rawName = typeof submittedName === 'string' ? submittedName : newPortfolioName;
    const trimmedName = rawName.trim();

    if (!trimmedName) {
        setCreateError("Portfolio name cannot be empty.");
        return;
    }

    const exists = portfolios.some(p => 
        p.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (exists) {
        setCreateError(`Portfolio '${trimmedName}' already exists.`);
        return;
    }

    const generatedId = Date.now();
    const settingsSnapshot = JSON.parse(JSON.stringify(initialSettings));
    
    const newInstance = new Portfolio(generatedId, trimmedName, settingsSnapshot);

    setPortfolios(currentPortfolios => {
        const updatedList = [...currentPortfolios, { 
            id:       generatedId, 
            name:     trimmedName, 
            instance: newInstance, 
            settings: settingsSnapshot,
            visible:  true,
            isStale:  false,
            color:    '#f9f9f9'
        }];

        return updatedList.sort((a, b) => 
            a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        );
    });

    setNewPortfolioName("");
    setCreateError("");
    setShowCreateModal(false);
};


    const handleCancelCreate = () => {
        setNewPortfolioName("");
        setCreateError("");
        setShowCreateModal(false);
    };

    const handleRename_original = (oldName, newName) => {
        setPortfolios(currentPortfolios => {
            // 1. Clean up references across all sibling instances
            currentPortfolios.forEach(p => {
                if (p.instance) {
                    p.instance.cleanUpReference(oldName, newName);
                }
            });

            // 2. Update the renamed portfolio's name and instance
            const updated = currentPortfolios.map(p => {
                if (p.name === oldName) {
                    if (p.instance) {
                        p.instance.name = newName;
                    }
                    return { ...p, name: newName };
                }
                return p;
            });

            // 3. Keep list sorted alphabetically
            return updated.sort((a, b) => 
                a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
            );
        });
    };

    const handleRename = (oldName, newName) => {
        setPortfolios(currentPortfolios => {
            const updated = currentPortfolios.map(p => {
                // Clean up instances safely
                if (p.instance) {
                    p.instance.cleanUpReference(oldName, newName);
                }

                if (p.name === oldName) {
                    if (p.instance) {
                        p.instance.name = newName;
                    }
                    return { ...p, name: newName };
                }
                return p;
            });

            // Return a sorted copy to guarantee a fresh reference
            return [...updated].sort((a, b) => 
                a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
            );
        });
    };

    const dismissStale = (e, id) => {
        e.stopPropagation();
        setPortfolios(portfolios.map(p => 
            p.id === id ? { ...p, isStale: false } : p
        ));
    };

    const toggleVisibility = (id) => {
        setPortfolios(portfolios.map(p => 
            p.id === id ? { ...p, visible: !p.visible } : p
        ));
    };

    // Purges slot references across peers when a portfolio is deleted
    const cleanUpDelete = (delPortfolioName) => {
        portfolios.forEach(p => {
            if (p.instance) {
                p.instance.cleanUpDelete(delPortfolioName);
            }
        });
    };

    const handleConfirmDelete = () => {
        if (!selectedId) return;

        const pToDelete = portfolios.find(p => p.id.toString() === selectedId);
        if (pToDelete) {
            cleanUpDelete(pToDelete.name);
            setPortfolios(portfolios.filter(x => x.id !== pToDelete.id));
        }
        
        setSelectedId("");
        setShowDeleteModal(false);
    };

    // Flags peers as stale if they reference a newly re-computed portfolio
    const cleanUpCompute = (computedPortfolioName) => {
        portfolios.forEach(p => {
            if (p.instance) {
                p.instance.cleanUpCompute(computedPortfolioName);
            }
        });
    };

    const handleComputeCleanup = (computedPortfolioName) => {
        const pToClean = portfolios.find(p => p.name === computedPortfolioName);
        if (pToClean) {
            cleanUpCompute(pToClean.name);
            setPortfolios([...portfolios]);
            //setRefreshTick(prev => prev + 1); 
        }
    };

    const xxxxxxxxxxxxxxxhandleComputeCleanup = (computedPortfolioName) => {
        const pToClean = portfolios.find(p => p.name === computedPortfolioName);
        if (pToClean) {
            // 1. Mark peer instances stale in memory
            cleanUpCompute(pToClean.name);

            // 2. Return shallow copies for stale portfolios to force React to notice prop updates
            setPortfolios(prevPortfolios => 
                prevPortfolios.map(p => {
                    if (p.instance && p.instance.isStale) {
                        return { ...p, _tick: Date.now() };
                    }
                    return p;
                })
            );
        }
    };

    const handleCancelDelete = () => {
        setSelectedId("");
        setShowDeleteModal(false);
    };

   /**
     * Accepts portfolio raw data from DB, rebuilds portfolio instances,
     * and replaces the active session in LibraryUI.
     * 
     * @param {Array<Object>} archiveData - Portfolio array from loadSession DB fetch
     */
    const handleLoad = (archiveData) => {
        if (!archiveData) return;
        
        const archiveList = Array.isArray(archiveData) ? archiveData : [archiveData];
        const newEntries = [];

        // Rebuild instances from loaded array
        archiveList.forEach((data) => {
            if (!data) return;

            const instance = new Portfolio(1, "dummy", {});
            const success = instance.RebuildArchive(data);

            if (success) {
                newEntries.push({
                    id: instance.id,
                    name: instance.name,
                    instance: instance,
                    settings: instance.GlobalEssentials,
                    visible: true,
                    isStale: false
                });
            } else {
                //console.error(`[handleLoad] Failed to rebuild portfolio instance:`, data?.name);

                 openHelp('ERR_LOAD_FAILURE', false, false, true);
            }
        });

        //alert("  in handleLoad with length " + newEntries.length);

        if (newEntries.length === 0) return;

        // Overwrite active session with fresh loaded entries
        setPortfolios(
            newEntries.sort((a, b) =>
                a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
            )
        );
    };

    return (
        <div className="home-library-wrapper">

            {/* Show Button: Always available when showLibrary is false */}
            {!showLibrary && (
                <button 
                    onClick={() => setShowLibrary(true)}
                    className="basic-3d-button"
                    style={{ marginTop: '15px', marginRight: '15px', padding: '10px 20px', fontWeight: 'bold' }}
                >
                    Show
                </button>
            )}

            {/* Library Dock Header Panel */}
            <div className={`library-dock ${showLibrary ? 'dock-visible' : 'dock-hidden'}`}>

              {/* External Controls Container (Stacked Vertically) */}
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '10px', 
                    marginRight: '15px',
                    justifyContent: 'center' 
                }}>
                    {/* HOME Button */}
                    <Hint text="Return to home page" position="left">
                        <button 
                            onClick={onGoHome}
                            className="basic-3d-button"
                            style={{ width: '70px', fontSize: '10px' }}
                        >
                            Home 
                        </button>
                    </Hint>

                    {/* Minimize Button */}
                    <Hint text="Minimize Library" position="left">
                        <button 
                            onClick={() => setShowLibrary(false)}
                            className="basic-3d-button" 
                            style={{ width: '70px', fontSize: '10px' }}
                        >
                            Minimize
                        </button>
                    </Hint>
                </div>
        
                {/* INNER CENTERING WRAPPER */}
                <div className="centered-dock-content">

                    <div className="dock-header">
                        <div className="dock-controls">

                            <div className="header-region-title-2">
                                Portfolio Library
                                <HelpTrigger keyName="portfolio-library" size="sm" />
                            </div>

                            <Hint text={isGuest ? "File operations prohibited" : "File operations"} position="bottom">
                                <button 
                                    onClick={() => setShowFileModal(true)}
                                    className="basic-3d-button"
                                    style={{ paddingLeft: '24px', paddingRight: '24px', minWidth: '70px',minHeight: '28px', marginRight: '20px' }}
                                    disabled={isGuest}
                                >
                                    File
                                </button>
                            </Hint>

                            <Hint text="Modify default settings" position="bottom">
                                <button 
                                    onClick={() => setShowSettingsModal(true)}
                                    className="basic-3d-button"
                                >
                                    Settings
                                </button>
                            </Hint>

                            <Hint text="Rename a portfolio" position="bottom">
                                <button 
                                    onClick={() => setShowRenameModal(true)}
                                    className="basic-3d-button"
                                >
                                    Rename
                                </button>
                            </Hint>

                            <Hint text="Rank portfolios from best to worst" position="bottom">
                                <button 
                                    onClick={() => setShowRankModal(true)}
                                    className="basic-3d-button"
                                >
                                    Rank
                                </button>
                            </Hint>
                            
                            <Hint text="Permanently remove a portfolio" position="bottom">
                                <button 
                                    onClick={() => setShowDeleteModal(true)} 
                                    className="basic-3d-button"
                                >
                                    Delete
                                </button>
                            </Hint>

                            <Hint text="Create a portfolio and place in Library" position="bottom">
                                <button 
                                    onClick={handleOpenCreateModal} 
                                    className="basic-3d-button"
                                    onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); } }}
                                >
                                    Create
                                </button>
                            </Hint>

                        </div>
                    </div>

                    




                    
                    <div className="portfolio-pills-container">
                        {portfolios.map(p => (
                            <div key={p.id} className="pill-wrapper">
                                <button 
                                    title={p.name}
                                    className={`btn-push-utility-2 ${p.visible ? 'active' : ''}`}
                                    onClick={() => toggleVisibility(p.id)}
                                >
                                    <span className="button-text-truncate">{p.name}</span>
                                </button>
                            </div>
                        ))}
                    </div>
                    

                </div> 

               

               
            </div>

            {/* Guest Restriction Notice — Inline Styled (Fits to Content) */}
            {isGuest && (
                <div 
                    style={{
                    width: "fit-content",
                    margin: "0px auto",
                    textAlign: "center",
                    fontSize: "16px",
                    fontStyle: "italic",
                    color: "black",
                    backgroundColor: "rgba(247, 227, 227, 0.9)",
                    padding: "8px 16px", 
                    boxSizing: "border-box"
                    }}
                >
                    Guests are restricted to historical data up to 2020 and cannot save any of their work.
                </div>
            )}
            

            {/* File Modal */}
            <FileModal 
                showModal={showFileModal}
                onClose={() => setShowFileModal(false)}
                portfolios={portfolios}
                onLoad={handleLoad}
            />

            {/* Global Settings Modal */}
            {showSettingsModal && (
                <GlobalSettings_modal 
                    repository={repository}
                    onClose={() => setShowSettingsModal(false)}
                />
            )}

            {/* Rename Portfolio Modal */}
            {showRenameModal && (
                <PortfolioModal_Rename
                    portfolios={portfolios}
                    onClose={() => setShowRenameModal(false)}
                    onRename={handleRename}
                />
            )}

            {/* Create Portfolio Modal */}
            {showCreateModal && (
                <PortfolioModal_Create
                    onClose={handleCancelCreate}
                    onConfirm={handleConfirmCreate}
                    error={createError}
                />
            )}

            {/* Delete Portfolio Modal */}
            {showDeleteModal && (
                <PortfolioModal_Delete
                    portfolios={portfolios}
                    selectedId={selectedId}
                    setSelectedId={setSelectedId}
                    onClose={handleCancelDelete}
                    onConfirm={handleConfirmDelete}
                />
            )}

            {showRankModal && (
                <RankUI 
                    allPortfolios={portfolios} 
                    onClose={() => setShowRankModal(false)}
                    repository={repository}
                    updateRepository={updateRepository}
                />
            )}

            {/* Active Workspace Portfolios */}
            <div className="workspace-container">
                {portfolios.map(p => (
                    p.visible && (
                        <PortfolioUI 
                            key={p.id} 
                            name={p.name} 
                            color={p.color}
                            settings={p.settings} 
                            portfolioLogic={p.instance}
                            allPortfolios={portfolios}
                            symbolList={symbolList}
                            repository={repository}
                            updateRepository={updateRepository}
                            handleComputeCleanup={handleComputeCleanup}
                            setPortfolios={setPortfolios}
                        />
                    )
                ))}
            </div>
        </div>
    );
}