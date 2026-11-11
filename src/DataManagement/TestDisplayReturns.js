import React from 'react';
import { initialSettings } from '../../app/GlobalSettings';

export default class TestDisplayReturns extends React.Component {
    constructor(props) {
        super(props);
        this.state = { data: null, tried: false };
    }

    componentDidMount() {
        const { ticker } = this.props;
        // This is the single, one-time call to the system
        const result = initialSettings.dataManager.FetchReturns(ticker);
        this.setState({ data: result, tried: true });
    }

    render() {
        const { ticker } = this.props;
        const { data, tried } = this.state;

        const boxStyle = {
            padding: '20px',
            margin: '10px 0',
            border: '3px solid #3498db',
            borderRadius: '8px',
            backgroundColor: '#ffffff',
            fontFamily: 'monospace'
        };

        if (!tried) return <div style={boxStyle}>🔍 Accessing Bridge for {ticker}...</div>;

        if (!data) {
            return (
                <div style={{ ...boxStyle, borderColor: 'red' }}>
                    <strong>❌ FAIL:</strong> DataManager returned NULL for [{ticker}].
                </div>
            );
        }

        return (
            <div style={boxStyle}>
                <h3 style={{ color: '#2980b9', marginTop: 0 }}>✅ DATA FOUND: {data.ticker}</h3>
                <hr />
                <p><strong>Source:</strong> {data.source}</p>
                <p><strong>Start Year:</strong> {data.startYear}</p>
                <div style={{ backgroundColor: '#eee', padding: '10px' }}>
                    <strong>Raw Returns:</strong><br />
                    { JSON.stringify(data.returns) }
                </div>
            </div>
        );
    }
}