import { Sidebar } from './Sidebar';
import { SampleList } from './SampleList';
import { Player } from './Player';

export function Layout() {
    return (
        <div className="app-container" style={{ flexDirection: 'column' }}>
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <Sidebar />
                <SampleList />
            </div>
            <Player />
        </div>
    );
}
